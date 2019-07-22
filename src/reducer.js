import * as constants from './constants';
import jwt from 'jsonwebtoken';
import text from './text.json';
import { parseBalances } from './functions';

let authenticated = false;
let balance = '0';
let exists = false;
let lang = 'en';
let textTerms = text.en;
let tfaAuth = false;
let tfaEnabled = false;
let uniqueId = '';
let wallet = {};

const token = localStorage.getItem('jwtToken');
jwt.verify(token, 'secret', (err, decoded) => {
	if (decoded) {
		authenticated = decoded.data.authenticated;
		exists = decoded.data.exists;
		lang = decoded.data.lang;
		tfaAuth = decoded.data.tfaAuth;
		tfaEnabled = decoded.data.tfaEnabled;
		uniqueId = decoded.data.uniqueId;
		wallet = decoded.data;

		if (lang === 'de') {
			textTerms = text.de;
		}

		if (lang === 'en') {
			textTerms = text.en;
		}

		if (authenticated && exists) {
			balance = parseBalances(decoded.data.balances);
		}
	};
});

const initial = () => ({
	authenticated,
	balance,
	exists,
	formLoading: false,
	lang,
	showToast: false,
	text: textTerms,
	tfaAuth,
	tfaEnabled,
	uniqueId,
	wallet
});

const app = (state = initial(), action) => {
	const payload = action.payload
	switch (action.type) {
		case constants.GET_BALANCES:
			const balance = parseBalances(payload);

			return {
				...state,
				balance
			}

		case constants.GET_CURRENT_PRICE:
			if (action.currency === 'USD') {
				return {
					...state,
					currentPrices: {
						...state.currentPrices,
						usd: payload.rate
					}
				}
			}

			return {
				...state,
				currentPrices: {
					...state.currentPrices,
					eur: payload.rate
				}
			}

		case constants.GET_HISTORICAL_PRICES:
			return {
				...state,
				chartData: payload
			}

		case constants.GET_QR_CODE:
			return {
				...state,
				qrCode: payload
			}

		case constants.GET_TRANSACTIONS:
			return {
				...state,
				wallet: payload
			}

		case constants.LOGOUT:
			return {
				...state,
				authenticated: false,
				balance: '0',
				exists: false,
				formLoading: false,
				showToast: false,
				tfaAuth: false,
				tfaEnabled: false,
				uniqueId: '',
				wallet: {}
			}

		case constants.SET_ADDRESS_VALUE:
			return {
				...state,
				addressVal: payload
			}

		case constants.SET_AMOUNT_VALUE:
			return {
				...state,
				amountVal: payload
			}

		case constants.SET_LANGUAGE:
			let textTerms = {};
			if (payload === 'de') {
				textTerms = text.de;
			}

			if (payload === 'en') {
				textTerms = text.en;
			}

			return {
				...state,
				lang: payload,
				text: textTerms
			}

		case constants.SET_MEMO_VALUE:
			return {
				...state,
				memoVal: payload
			}

		case constants.SET_TO_INITIAL:
			return initial();

		case constants.SEND_STELLAR:
			return {
				...state,
				addressVal: '',
				amountVal: '',
				memoVal: '',
				formLoading: false,
				sendError: action.sendError,
				showToast: !action.sendError,
			}

		case constants.SET_WALLET_INFO:
			return {
				...state,
				authenticated: payload.authenticated,
				exists: payload.exists,
				qrCode: payload.qrCode,
				tfaEnabled: payload.tfaEnabled,
				uniqueId: payload.uniqueId,
				wallet: payload
			}

		case constants.TOGGLE_FORM_LOADING:
			return {
				...state,
				formLoading: !state.formLoading
			}

		case constants.TOGGLE_QR_CODE:
			return {
				...state,
				tfaAuth: payload === 1 ? true : false,
				tfaEnabled: payload === 1
			}

		case constants.TOGGLE_TFA_AUTH:
			return {
				...state,
				tfaAuth: !state.tfaAuth
			}

		default:
			return state
	}
}

export default app;
