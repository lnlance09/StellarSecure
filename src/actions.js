import * as constants from './constants';
import { parseJwt, setToken } from './functions';
import request from 'request';
import StellarSdk from 'stellar-sdk';

export const getBalances = ({ balances }) => dispatch => {
	dispatch({
		payload: balances,
		type: constants.GET_BALANCES
	})
}

export const getCurrentPrice = ({ currency }) => dispatch => {
	request.get(
		`${window.location.origin}/stellar.php`,
		{
			json: true,
			qs: {
				function: 'getCurrentPrice',
				currency
			}
		},
		function(err, response, body) {
			dispatch({
				currency,
				payload: body,
				type: constants.GET_CURRENT_PRICE
			})
		}
	)
}

export const getHistoricalPrices = ({ currency, end, start }) => dispatch => {
	request.get(
		`${window.location.origin}/stellar.php`,
		{
			json: true,
			qs: {
				function: 'getHistoricalPrices',
				page_size: 'all',
				currency,
				end,
				start
			}
		},
		function(err, response, body) {
			dispatch({
				payload: body,
				type: constants.GET_HISTORICAL_PRICES
			})
		}
	)
}

export const getTransactions = ({ publicKey }) => dispatch => {
	const server = new StellarSdk.Server('https://horizon.stellar.org');
	StellarSdk.Network.usePublicNetwork();

	server.operations()
		.forAccount(publicKey)
		.limit(100)
		.order('desc')
		.call()
		.then(ops => {
			const records = ops.records;
			let localData = parseJwt();
			localData.records = records;
			setToken(localData);

			dispatch({
				payload: localData,
				type: constants.GET_TRANSACTIONS
			});
		});
}

export const logout = () => dispatch => {
	localStorage.removeItem('jwtToken');
	dispatch({
		type: constants.LOGOUT
	});
}

export const sendStellar = ({
	amount,
	destination,
	memo,
	secretKey
}) => dispatch => {
	const sourceKeypair = StellarSdk.Keypair.fromSecret(secretKey);
	const sourcePublicKey = sourceKeypair.publicKey();
	// console.log('src publicKey');
	// console.log(sourcePublicKey);

	const server = new StellarSdk.Server('https://horizon.stellar.org');
	StellarSdk.Network.usePublicNetwork();

	(async function main() {
		const account = await server.loadAccount(sourcePublicKey);
		// console.log('src publicKey');
		// console.log(sourcePublicKey);
		// console.log(account);
		const fee = await server.fetchBaseFee();

		const transaction = new StellarSdk.TransactionBuilder(account, { fee })
		.addOperation(StellarSdk.Operation.payment({
			destination,
			asset: StellarSdk.Asset.native(),
			amount,
		}))
		.setTimeout(30)
		.build();
		// console.log('transaction');
		// console.log(transaction);

		transaction.sign(sourceKeypair);
		// console.log(transaction.toEnvelope().toXDR('base64'));

		try {
			const transactionResult = await server.submitTransaction(transaction);
			server.operations()
				.forAccount(sourcePublicKey)
				.limit(25)
				.order('desc')
				.call()
				.then(ops => {
					const records = ops.records;
					let localData = parseJwt();
					localData.records = records;
					setToken(localData);

					dispatch({
						payload: localData,
						type: constants.GET_TRANSACTIONS
					});
				});

			dispatch({
				sendError: false,
				type: constants.SEND_STELLAR
			});

			const accountUpdate = await server.loadAccount(sourcePublicKey);
			dispatch({
				payload: accountUpdate.balances,
				type: constants.GET_BALANCES
			});

			console.log(JSON.stringify(transactionResult, null, 2));
			console.log('\nSuccess! View the transaction at: ');
			console.log(transactionResult._links.transaction.href);
		} catch (e) {
			console.log('An error has occured:');
			console.log(e);

			const newAccount = new StellarSdk.TransactionBuilder(account, { fee })
			.addOperation(StellarSdk.Operation.createAccount({
				destination,
				startingBalance: amount
			}))
			.setTimeout(30)
			.build();

			newAccount.sign(StellarSdk.Keypair.fromSecret(secretKey));
			server.submitTransaction(newAccount)
			.then(result => {
				dispatch({
					sendError: false,
					type: constants.SEND_STELLAR
				});
			})
			.catch(err => {
				dispatch({
					sendError: true,
					type: constants.SEND_STELLAR
				});
			})
		}
	})();
}

export const setToInitial = () => dispatch => {
	dispatch({
		type: constants.SET_TO_INITIAL
	});
}

export const setAddressVal = ({ value }) => dispatch => {
	dispatch({
		payload: value,
		type: constants.SET_ADDRESS_VALUE
	});
}

export const setAmountVal = ({ value }) => dispatch => {
	dispatch({
		payload: value,
		type: constants.SET_AMOUNT_VALUE
	});
}

export const setLanguage = ({ lang }) => dispatch => {
	let langToken = parseJwt();
	if (langToken) {
		langToken.lang = lang;
	} else {
		langToken = {
			lang
		};
	}

	setToken(langToken);

	dispatch({
		payload: lang,
		type: constants.SET_LANGUAGE
	});
}

export const setMemoVal = ({ value }) => dispatch => {
	dispatch({
		payload: value,
		type: constants.SET_MEMO_VALUE
	});
}

export const setWalletInfo = ({
	address,
	data,
	exists,
	qrCode,
	secretKey
}) => dispatch => {
	data.exists = exists;
	data.publicKey = address;
	data.secretKey = secretKey;
	const token = setToken(data);

	request.get(
		`${window.location.origin}/stellar.php`,
		{
			headers: {
				Authorization: token
			},
			json: true,
			qs: {
				address,
				function: 'getQrCode',
				qrCode
			}
		},
		function(err, response, body) {
			const newToken = parseJwt();
			newToken.authenticated = true;
			newToken.qrCode = body.authCode;
			newToken.tfaEnabled = body.tfaEnabled;
			newToken.uniqueId = body.uniqueId;
			setToken(newToken);

			dispatch({
				payload: newToken,
				type: constants.SET_WALLET_INFO
			});
		}
	);
}

export const toggleFormLoading = () => dispatch => {
	dispatch({
		type: constants.TOGGLE_FORM_LOADING
	})
}

export const toggleQrCode = ({ enable, uniqueId }) => dispatch => {
	let token = parseJwt();

	if (token) {
		request.post(
			`${window.location.origin}/stellar.php?function=toggleQrCode`,
			{
				json: true,
				form: {
					enable: enable ? 1 : 0,
					uniqueId
				}
			},
			function(err, response, body) {
				token.tfaAuth = body.tfaEnabled === 1 ? true : false;
				token.tfaEnabled = body.tfaEnabled === 1;
				setToken(token);

				dispatch({
					payload: body.tfaEnabled,
					type: constants.TOGGLE_QR_CODE
				});
			}
		);
	}
}

export const toggleTfaAuth = () => dispatch => {
	dispatch({
		type: constants.TOGGLE_TFA_AUTH
	});
}

