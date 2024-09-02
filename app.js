import express from 'express'
let app = express();
import crypto from 'crypto'
import axios from 'axios'

let session = ""
let sequence = 1;
const username = '';
const USERNAME = '';
const PASSWORD = '';
const password = '';
const deviceIP = '';
const EJOIN_BASE_URL = '';
const port = '';
let taskIds = [];

const sendEjoinPostRequest = async (url, data) => {
    try {
        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        })
        return response.data;
    } catch (error) {
        console.error('Error sending request:', error);
        return null;
    }
};

const sendEjoinGetRequest = async (url) => {
    try {
        const response = await axios.get(url,{
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        })
        return response.data;
    } catch (error) {
        console.error('Error sending request:', error);
        return null;
    }
};

async function establishUserSession() {
    const cnonce = crypto.randomBytes(16).toString('hex');
    const urlResource = '/crypt_sess.json';

    const authString = username + password + cnonce + urlResource;
    const auth = crypto.createHash('md5').update(authString).digest('hex');


    const url = `http://${deviceIP}:${port}/crypt_sess.json?username=${encodeURIComponent(username)}&cnonce=${encodeURIComponent(cnonce)}&auth=${encodeURIComponent(auth)}&expires=180`;

    try {
        const response = await axios.get(url).then((resp)=>{
            return resp
        });
        return response.data;
    } catch (error) {
        console.error('Error establishing session:', error.response ? error.response.data : error.message);
    }
}

async function getStatus() {
    const urlResource = '/goip_get_status.html';
    const url = `http://${deviceIP}:${port}${urlResource}`;
    const auth = crypto.createHash('md5')
        .update(username + password + session + sequence + urlResource)
        .digest('hex');

    try {
        const response = await axios.get(url, {
            params: {
                seq: sequence,
                auth: auth,
                session: session
            },
            timeout: 20000
        });
        console.log('Device Status:', response.data);
        sequence++;
        return response.data;
    } catch (error) {
        if (error.code === 'ECONNRESET') {
            console.error('Connection was reset by the server:', error.message);
        } else if (error.code === 'ETIMEDOUT') {
            console.error('Request timed out:', error.message);
        } else {
            console.error('Error establishing session:', error.response ? error.response.data : error.message);
        }
    }
}

app.get('/',  async function (req, res) {
    session = await establishUserSession().then((res) => {
        return res.session
    })
    res.send('Hello World!');
});

app.get('/status',  async function (req, res) {
    await getStatus();
    res.send('Hello World!');
});

function uuidToSmallInt(uuid) {
    const hash = crypto.createHash('md5').update(uuid).digest('hex');
    return parseInt(hash.substring(0, 5), 16);
}

app.get('/send-message', async (req, res) => {

    const reqData = {
        "phoneNumbers": ["3104700994", "3104700994"],
        "message": "Hello, this is a test message.",
        "isMMS": false,
        "bccNumbers": ["1122334455"],
        "attachments": null,  // No attachments for SMS
        "sendRate": "1000"  // 1 second interval between messages
    }

    let { phoneNumbers, message, isMMS, bccNumbers, attachments, sendRate, smsc,
        tmo,
        sdr,
        fdr,
        dr,
        sr_prd,
        sr_cnt,
        smstitle
    } = reqData;

    phoneNumbers = ["3104700994"]
    message  = "Hello, this is a test message."
    isMMS= false
    bccNumbers= null
    attachments= "txt|zsSxvg==;jpg|4AAQSkZJRgABAgAAZAB"
    sendRate= 5000  // 1 second interval between messages

    const tasks = phoneNumbers.map((number, index) => ({
        tid: 1,
        to: number,
        sms: message,
        smstype: isMMS ? 1 : 0,
        attachments: isMMS && attachments ? attachments : '',
        intvl: sendRate || "0", // Adjust interval based on send rate
        smsc: smsc || 0,
        tmo: tmo || 30,
        sdr: sdr || 0,
        fdr: fdr || 1,
        dr: dr || 0,
        sr_prd: sr_prd || 60,
        sr_cnt: sr_cnt || 10,
        smstitle: smstitle || '',
    }));

    if (bccNumbers && bccNumbers.length > 0) {
        bccNumbers.forEach((bcc,index) => {
            tasks.push({
                tid: 1 ,
                to: bcc,
                sms: message,
                smstype: isMMS ? 1 : 0,
                attachments: isMMS && attachments ? attachments : '',
                intvl: sendRate || "0",
            });
        });
    }

    const data = {
        type: 'send-sms',
        task_num: tasks.length,
        tasks: tasks
    };

    const response = await sendEjoinPostRequest(`${EJOIN_BASE_URL}/goip_post_sms.html?username=${USERNAME}&password=${PASSWORD}`, data).then((res)=>{
        taskIds.push(res.status[0].tid)
        return res;
    });

    if (response && response.code === 200) {
        res.status(200).send({ status: 'success', response });
    } else {
        res.status(500).send({ status: 'failed', response });
    }
});

app.get('/report', async (req, res) => {
    await sendEjoinGetRequest(`${EJOIN_BASE_URL}/goip_post_sms.html?username=${USERNAME}&password=${PASSWORD}`, {})
    res.send('Hello World!');
});

app.post('/pause-task', async (req, res) => {
    const {taskIds} =  req.body
    const data = { tids: taskIds};
    const response = await sendEjoinPostRequest(`${EJOIN_BASE_URL}/goip_pause_sms.html?username=${USERNAME}&password=${PASSWORD}`, data).then((res)=>{
        return res
    })
    res.status(200).send({ status: 'success', response });
});

app.post('/resume-task', async (req, res) => {
    const {taskIds} =  req.body
    const data = { tids: taskIds};
    const response = await sendEjoinPostRequest(`${EJOIN_BASE_URL}/goip_resume_sms.html?username=${USERNAME}&password=${PASSWORD}`, data).then((res)=>{
        return res
    })
    res.status(200).send({ status: 'success', response });
});

app.get('/get-tasks', async (req, res) => {
    const response = await sendEjoinGetRequest(`${EJOIN_BASE_URL}/goip_get_tasks.html?pos=0&port=10&version=1.1&username=${USERNAME}&password=${PASSWORD}`).then((res)=>{
        return res
    })
    res.status(200).send({ status: 'success', response });
});

app.use(express.json());

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
