const jwt = require("jsonwebtoken");
const fs = require("fs");
const FormData = require("form-data");
const axios = require("axios");
require('dotenv').config();

const token = jwt.sign({ userId: 1, email: 'admin@salao24h.com.br', role: 'admin' }, process.env.JWT_SECRET || "salao24h_secret_key_2024", { expiresIn: "1h" });

async function upload() {
    const form = new FormData();
    form.append('file', fs.createReadStream('/tmp/test-logo.png'));

    try {
        const res = await axios.post('http://127.0.0.1:5000/api/upload?type=unit', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        console.log("SUCCESS:", res.data);
    } catch (err) {
        if (err.response) {
            console.error("ERROR STATUS:", err.response.status);
            console.error("ERROR DATA:", err.response.data);
        } else {
            console.error("ERROR MESSAGE:", err.message);
        }
    }
}
upload();
