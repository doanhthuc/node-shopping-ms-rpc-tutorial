const ampqlib = require('amqplib');
const { v4: uuid4 } = require('uuid');

let ampqlibConnection = null;

const getChannel = async () => {
    if (!ampqlibConnection) {
        ampqlibConnection = await ampqlib.connect('amqp://localhost');
    }
    return await ampqlibConnection.createChannel();
};

const expensiveDBOperation = (payload, fakeResponse) => {
    console.log({payload});
    console.log({fakeResponse});
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(fakeResponse);
        }, 2000);
    })
}

const RPCObserver = async (RPC_QUEUE_NAME, fakeResponse) => {
    const channel = await getChannel();
    await channel.assertQueue(RPC_QUEUE_NAME, { durable: false });
    channel.prefetch(1);

    channel.consume(RPC_QUEUE_NAME, async (msg) => {
        if (msg.content) {
            const payload = JSON.parse(msg.content.toString());
            const response = await expensiveDBOperation(payload, fakeResponse) // call fake DB operation

            channel.sendToQueue(
                msg.properties.replyTo,
                Buffer.from(JSON.stringify(response)),
                {
                    correlationId: msg.properties.correlationId,
                }
            );
            channel.ack(msg);
        }
    },
        { noAck: false }
    )
};

const requestData = async (RPC_QUEUE_NAME, requestPayload, uuid) => {
    const channel = await getChannel();

    const q = await channel.assertQueue('', { exclusive: true });

    channel.sendToQueue(RPC_QUEUE_NAME, Buffer.from(JSON.stringify(requestPayload)), {
        replyTo: q.queue,
        correlationId: uuid,
    })

    return new Promise((resolve, reject) => {
        // timeout
        const timeout = setTimeout(() => {
            channel.close();
            resolve('API Could not fulfill the request');
        }, 8000);
        channel.consume(
            q.queue,
            (msg) => {
                if (msg.properties.correlationId === uuid) {
                    resolve(JSON.parse(msg.content.toString()));
                    clearTimeout(timeout);
                } else {
                    reject('Data Not Found');
                }
            },
            { noAck: true }
        )
    });
}

const RPCRequest = async (RPC_QUEUE_NAME, requestPayload) => {
    const uuid = uuid4();
    return await requestData(RPC_QUEUE_NAME, requestPayload, uuid);
};

module.exports = {
    getChannel,
    RPCObserver,
    RPCRequest,
}