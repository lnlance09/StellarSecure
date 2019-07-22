import jwt from 'jsonwebtoken';

export const encodeText = text => {
	let letters = text.split('');
	let newArr = [];
	for (let i = 0; i < letters.length; i++) {
		newArr.push(letters[i]);
		newArr.push(makeStr(4));
	}

	return newArr.join('');
}

const makeStr = length => {
	var result = '';
	var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var charsLength = chars.length;
	for ( let i = 0; i < length; i++ ) {
		result += chars.charAt(Math.floor(Math.random() * charsLength));
	}
	return result;
}

export const parseBalances = balances => {
	let balance = '0';
	for (var i=0; i<balances.length; i++) {
		if (balances[i].asset_type === 'native') {
			balance = balances[i].balance;
		}
	}

	return balance;
}

export const parseJwt = () => {
	let localData = false;
	jwt.verify(localStorage.getItem('jwtToken'), 'secret', (err, decoded) => {
		if (decoded) {
			localData = {};
			localData = decoded.data;
		}
	});
	return localData;
}

export const round = (value, precision) => {
	var multiplier = Math.pow(10, precision || 0);
	return Math.round(value * multiplier) / multiplier;
}

export const setToken = localData => {
	const token = jwt.sign({ data: localData }, 'secret', {
		expiresIn: 60 * 60 * 5
	})
	localStorage.setItem('jwtToken', token);
	return token;
}
