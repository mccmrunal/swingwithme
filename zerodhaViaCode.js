const axios = require('axios');
const { URLSearchParams } = require('url');
require('dotenv').config();
const { TOTP } = require('totp-generator');

const {
    Z_USERNAME,
    Z_PASSWORD,
    Z_TOTP_SECRET,
    Z_API_KEY,
    Z_API_SECRET
} = process.env;

const apiKey = Z_API_KEY;
const username = Z_USERNAME;
const password = Z_PASSWORD;
const totpKey = Z_TOTP_SECRET;
const loginUrl = `https://kite.zerodha.com/api/login`;

async function getRequestToken(credentials) {
    try {
        const session = axios.create({ withCredentials: true });

        // Step 1: Initial GET to get sess_id
        const initialResponse = await session.get(`https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`);
        const referer = initialResponse.request.res.responseUrl;
        const urlParams = new URLSearchParams(referer.split('?')[1]);
        const sessId = urlParams.get('sess_id');

        if (!sessId) {
            throw new Error('sess_id not found');
        }
        console.log('Captured sess_id:', sessId);

        const cookies = initialResponse.headers['set-cookie'] || [];

        // Step 2: Login POST with username and password
        const loginPayload = new URLSearchParams({
            user_id: username,
            password: password,
            type: 'user_id'
        });

        let loginResponse = await session.post(loginUrl, loginPayload.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies.join('; '),
                'referer': `https://kite.zerodha.com/connect/login?api_key=${apiKey}&sess_id=${sessId}`
            }
        });

        const loginCookies = loginResponse.headers['set-cookie'] || [];

        // Step 3: TOTP verification
        const { otp } = TOTP.generate(totpKey);

        const totpPayload = new URLSearchParams({
            user_id: username,
            request_id: loginResponse.data.data.request_id,
            twofa_value: otp,
            twofa_type: 'totp',
            skip_session: true
        });

        const totpResponse = await session.post('https://kite.zerodha.com/api/twofa', totpPayload.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': loginCookies.join('; '),
                'referer': `https://kite.zerodha.com/connect/login?api_key=${apiKey}&sess_id=${sessId}`
            },
            maxRedirects: 0,
            validateStatus: (status) => status >= 200 && status < 400 // Allow 3xx redirects
        });

        // Step 4: After successful TOTP, proceed to get the request token
        loginResponse = await axios.get('https://kite.zerodha.com/connect/login', {
            params: {
                api_key: apiKey,
                sess_id: sessId,
                skip_session: true
            },
            maxRedirects: 0, // Handle redirects manually
            validateStatus: (status) => status >= 200 && status < 400
        });
                    
        const finishUrl = loginResponse.headers.location;
        console.log('Redirected to:', finishUrl);

        // Step 5: Follow the redirect to get final request token
        const finishResponse = await axios.get(finishUrl, {
            baseURL: 'https://kite.zerodha.com',
            maxRedirects: 0,
            validateStatus: (status) => status >= 200 && status < 400
        });

        const finalRedirect = finishResponse.headers.location;
        console.log('Final redirect to app:', finalRedirect);

        // Extract request_token from final URL
        const urlObj = new URL(finalRedirect);
        const requestToken = urlObj.searchParams.get('request_token');

        console.log('Request Token:', requestToken);

        return requestToken;

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        throw error;
    }
}

// Example usage
const credentials = {
    api_key: apiKey,
    username: username,
    password: password,
    totp_key: totpKey
};

getRequestToken(credentials)
    .then(requestToken => {
        console.log('🎯 Final Request Token:', requestToken);
    })
    .catch(err => {
        console.error('Error fetching request token:', err);
    });
