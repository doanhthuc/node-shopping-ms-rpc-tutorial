const express = require('express');
const { RPCObserver } = require('./rpc');
const PORT = 8000;

const app = express();
app.use(express.json());

const fakeProductResponse = {
    _id: '1p243546',
    title: 'Iphone 14 pro max',
    price: 1000,
}

RPCObserver("PRODUCT_RPC", fakeProductResponse);

app.get('/customer', async (req, res) => {
    const requestPayload = {
        customerId: '1c243546',  
    }
    try {
        const responseData = await RPCRequest('CUSTOMER_RPC', requestPayload);
        console.log(responseData);
        return res.status(200).json(responseData);
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
});

app.get("/", (req, res) => {
    return res.json("Product Service");
})

app.listen(PORT, () => {
    console.log(`Product Service is running on port ${PORT}`);
    console.clear();
});