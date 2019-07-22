import { applyMiddleware, compose, createStore } from 'redux';
import thunk from 'redux-thunk';
import reducer from './reducer';

const store = createStore(
	reducer,
	compose(
		applyMiddleware(thunk)
	)
)

export default store;
