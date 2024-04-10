const express = require('express');
const router = express.Router();
const axios = require('axios');
const { HmacSHA256 } = require('crypto-js');
const Base64 = require('crypto-js/enc-base64');
require('dotenv').config()
//console.log(process.env) // remove this after you've confirmed it is working
const {
  LINEPAY_CHANNEL_ID,
  LINEPAY_VERSION,
  LINEPAY_SITE,
  LINEPAY_CHANNEL_SECRET_KEY,
  LINEPAY_RETURN_HOST,
  LINEPAY_RETURN_CONFIRM_URL,
  LINEPAY_RETURN_CANCEL_URL } = process.env;
const sampleData = require('../sample/sampleData');

// console.log(sampleData);
const orders = {};

/* 前端頁面 */
router
  .get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
  })
  .get('/list', (req, res) => {
    const order = sampleData;
    console.log(order);
    res.render('list',  {order} );
  })
  .get('/checkout/:id', (req, res) => {
    const { id } = req.params;
    // console.log(id);
    const order = sampleData[id];
    //全新訂單//多一個屬性orderId
    order.orderId = parseInt(new Date().getTime() / 1000);
    // console.log(order);
    orders[order.orderId] = order;
    res.render('checkout', { order });
  });




// 跟LINEPAY串接的API
router
  .post("/createOrder/:orderId", async (req, res) => {
    const { orderId } = req.params;
    const order = orders[orderId]

    // console.log("createOrder", order);

    try {
      const linePayBody = {
        ...order,
        redirectUrls: {
          confirmUrl: `${LINEPAY_RETURN_HOST}${LINEPAY_RETURN_CONFIRM_URL}`,
          cancelUrl: `${LINEPAY_RETURN_HOST}${LINEPAY_RETURN_CONFIRM_URL}`
        }
      }

      const uri = '/payments/request';
      const headers = createSignature(uri, linePayBody);
      // const nonce = parseInt(new Date().getTime() / 1000);
      // const string = `${LINEPAY_CHANNEL_SECRET_KEY}/${LINEPAY_VERSION}${uri}${JSON.stringify(linePayBody)}${nonce}`;
      // const signature = Base64.stringify(HmacSHA256(string, LINEPAY_CHANNEL_SECRET_KEY));//簽章
      // const headers = {
      //   'X-LINE-ChannelId': LINEPAY_CHANNEL_ID,
      //   'Content-Type': 'application/json',
      //   'X-LINE-Authorization-Nonce': nonce,
      //   'X-LINE-Authorization': signature,
      // }
      //準備送給linepay資訊
      // console.log(linePayBody, signature);
      const url = `${LINEPAY_SITE}/${LINEPAY_VERSION}${uri}`;

      const linePayRes = await axios.post(url, linePayBody, { headers });
      //console.log(linePayRes.data.info);//路徑位置
      if (linePayRes?.data?.returnCode === '0000') {
        res.redirect(linePayRes?.data?.info.paymentUrl.web)
      }
      // console.log({headers});
      // console.log(LINEPAY_CHANNEL_ID);
      // console.log(url);
      // console.log(linePayBody);
      // console.log(linePayRes);
    } catch (error) {
      console.log(error);
      //錯誤的回饋
      res.end();
    }
  })
  .get('/linePay/confirm', async (req, res) => {
    //交易完成後
    // console.log(req.query);
    const { transactionId, orderId } = req.query;
    // console.log(transactionId, orderId);

    try {
      const order = orders[orderId];

      const linePayBody = {
        amount: order.amount,
        currency: 'TWD'
      };

      const uri = `/payments/${transactionId}/confirm`;

      const headers = createSignature(uri, linePayBody);
      const url = `${LINEPAY_SITE}/${LINEPAY_VERSION}${uri}`;
      const linePayRes = await axios.post(url, linePayBody, { headers });
      console.log(linePayRes);
      res.render('end', { order });
    } catch (error) {
      console.log(error);
      res.end();
    }



  });

function createSignature(uri, linePayBody) {
  const nonce = parseInt(new Date().getTime() / 1000);
  const string = `${LINEPAY_CHANNEL_SECRET_KEY}/${LINEPAY_VERSION}${uri}${JSON.stringify(linePayBody)}${nonce}`;
  const signature = Base64.stringify(HmacSHA256(string, LINEPAY_CHANNEL_SECRET_KEY)); //簽章
  const headers = {
    'X-LINE-ChannelId': LINEPAY_CHANNEL_ID,
    'Content-Type': 'application/json',
    'X-LINE-Authorization-Nonce': nonce,
    'X-LINE-Authorization': signature,
  };
  return headers;
}
module.exports = router;


