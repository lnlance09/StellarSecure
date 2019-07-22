import './semantic/dist/semantic.min.css';
import './css/App.css';
import authenticator from 'authenticator';
import ChartPic from './images/stellar.jpg';
import Chart from 'react-google-charts';
import Moment from 'react-moment';
import PropTypes from 'prop-types';
import QRCode from 'qrcode.react';
import StellarSdk from 'stellar-sdk';
import store from './store';
import textJson from './text.json';
import {
	getBalances,
	getCurrentPrice,
	getHistoricalPrices,
	getTransactions,
	logout,
	sendStellar,
	setAddressVal,
	setAmountVal,
	setLanguage,
	setMemoVal,
	setToInitial,
	setWalletInfo,
	toggleFormLoading,
	toggleQrCode,
	toggleTfaAuth
} from './actions';
import { round } from './functions';
import { Provider, connect } from 'react-redux';
import React, { Component } from 'react';
import {
	Button,
	Container,
	Divider,
	Dropdown,
	Flag,
	Form,
	Grid,
	Header,
	Icon,
	Image,
	Input,
	Label,
	List,
	Menu,
	Message,
	Modal,
	Placeholder,
	Radio,
	Responsive,
	Segment,
	Table,
	Visibility,
} from 'semantic-ui-react';

const getWidth = () => {
	const isSSR = typeof window === 'undefined';
	return isSSR ? Responsive.onlyTablet.minWidth : window.innerWidth;
}

class App extends Component {
	constructor(props) {
		super(props);

		this.state = {
			auth: false,
			existingWalletModalOpen: false,
			fixed: false,
			loginError: false,
			newWalletModalOpen: false,
			publicKey: null,
			secretKey: null,
			secretKeyVal: '',
			sendError: false,
			sendErrorMsg: false,
			siteName: 'Stellar Secure',
			start: '1407196800',
			timeCode: '',
			timeCodeError: false,
			usdVal: '1',
			xmlVal: ''
		};

		this.onChangeSecretKey = this.onChangeSecretKey.bind(this);
		this.onChangeUsdVal = this.onChangeUsdVal.bind(this);
		this.toggleQrCode = this.toggleQrCode.bind(this);

		this.props.getCurrentPrice({ currency: 'USD' });
		this.props.getCurrentPrice({ currency: 'EUR' });
		this.props.getHistoricalPrices({ currency: 'USD', end: '1563416399000' });
		this.props.setToInitial();
	}

	componentDidMount() {
		if (this.props.authenticated && this.props.exists) {
			this.getAccountInfo(this.props.wallet.secretKey);
		}
	}

	convertCurrency = amount => {
		const xlmVal = (amount/this.props.currentPrices.usd);
		this.setState({ xlmVal })
	}

	createWallet = () => {
		const keyPair = StellarSdk.Keypair.random();
		const publicKey = keyPair.publicKey();
		const secretKey = keyPair.secret();
		this.setState({ publicKey, secretKey });
		return {
			publicKey,
			secretKey
		};
	}

	decrypt = msg => atob(msg);

	getKeyPairFromSecret = secretKey => {
		try {
			const keyPair = StellarSdk.Keypair.fromSecret(secretKey);
			const publicKey = keyPair.publicKey();
			this.setState({ 
				loginError: false,
				publicKey,
				secretKey
			});
			return {
				publicKey,
				secretKey
			};
		} catch(e) {
			this.setState({ loginError: true });
			return false;
		}
	}

	generateSecret = () => {
		const key = authenticator.generateKey();
		const uri = authenticator.generateTotpUri(key, '', 'Stellar Secure', 'SHA1', 6, 30);
		return {
			key,
			uri
		};
	};

	generateUri = key => authenticator.generateTotpUri(key, '', 'Stellar Secure', 'SHA1', 6, 30);

	generateToken = key => authenticator.generateToken(key);

	getAccountInfo = secret => {
		const keyPair = this.getKeyPairFromSecret(secret);
		if (keyPair) {
			const qrCode = this.generateSecret();
			const server = new StellarSdk.Server('https://horizon.stellar.org');
			StellarSdk.Network.usePublicNetwork();
			server.loadAccount(keyPair.publicKey).then(data => {
				this.props.setWalletInfo({
					address: keyPair.publicKey,
					data,
					exists: true,
					qrCode,
					secretKey: keyPair.secretKey
				});
				this.props.getBalances({ balances: data.balances });
				this.props.getTransactions({ publicKey: keyPair.publicKey });
			}, err => {
				// const info = this.createWallet();
				this.props.setWalletInfo({
					address: keyPair.publicKey,
					data: {},
					exists: false,
					qrCode,
					secretKey: keyPair.secretKey
				});
			});
			this.setState({ secretKeyVal: '' })
			return true;
		}
		return false;
	};

	onChangeAddress = (e, { value }) => this.props.setAddressVal({ value });

	onChangeAmount = (e, { value }) => this.props.setAmountVal({ value });

	onChangeMemo = (e, { value }) => this.props.setMemoVal({ value });

	onChangeTimeCode = (e, { value }) => {
		if (!isNaN(value)) {
			this.setState({ timeCode: value });
		}
	};

	onChangeSecretKey = (e, { value }) => this.setState({ secretKeyVal: value });

	onChangeUsdVal = (e, { value }) => this.setState({ usdVal: value });

	sendPayment = (amount, destination, memo) => {
		if (destination.length !== 56) {
			this.setState({ sendError: true, sendErrorMsg: 'That destination is not valid' });
			return false;
		}

		if (amount > this.props.balance) {
			this.setState({ sendError: true, sendErrorMsg: "You don't have enough Stellar to send that much." });
			return false;
		}

		if (amount <= 0) {
			this.setState({ sendError: true, sendErrorMsg: 'You must specify an amount' });
			return false;
		}

		this.setState({ sendError: false, sendErrorMsg: '' });
		this.props.toggleFormLoading();
		this.props.sendStellar({
			amount: `${amount}`,
			destination,
			secretKey: this.props.wallet.secretKey
		});
	};

	submitTimeCode = timeCode => {
		if (timeCode.length !== 6) {
			return false;
		}

		const timeToken = authenticator.generateToken(this.decrypt(this.props.wallet.qrCode));
		if (timeCode !== timeToken) {
			this.setState({ timeCodeError: true });
			return false;
		}

		this.setState({ timeCodeError: false });
		this.props.toggleTfaAuth();
	};

	toggleExistingModal = () => this.setState({ existingWalletModalOpen: !this.state.existingWalletModalOpen });

	toggleFixedMenu = () => this.setState({ fixed: !this.state.fixed });

	toggleNewModal = () => this.setState({ newWalletModalOpen: !this.state.newWalletModalOpen });

	toggleQrCode = () => this.props.toggleQrCode({ enable: !this.props.tfaEnabled, uniqueId: this.props.uniqueId });

	render() {
		const {
			existingWalletModalOpen,
			fixed,
			newWalletModalOpen,
			publicKey,
			secretKey,
			secretKeyVal,
			sendError,
			sendErrorMsg,
			siteName,
			timeCode,
			timeCodeError,
			usdVal,
			xlmVal
		} = this.state;

		const {
			addressVal,
			amountVal,
			authenticated,
			chartData,
			exists,
			memoVal,
			showToast,
			text,
			tfaAuth,
			tfaEnabled
		} = this.props;

		const capitalize = s => {
			if (typeof s !== 'string') {
				return '';
			}
			return s.charAt(0).toUpperCase() + s.slice(1)
		}

		const langOptions = [
			{ key: 1, text: 'English', flag: 'uk', value: 'en' },
			{ key: 2, text: 'German', flag: 'de', value: 'de' }
		];


		const ConversionSegment = (
			<div>
				<Header attached='top' size='huge'>
					{text.convert}
				</Header>
				<Form
					as={Segment}
					attached
					size='large'
				>
					<Form.Group widths='equal'>
						<Form.Input
							fluid
							icon='usd'
							iconPosition='left'
							onChange={this.onChangeUsdVal}
							placeholder='USD'
							type='number'
							value={usdVal}
						/>
						<Form.Input
							fluid
							icon='rocket'
							iconPosition='left'
							onChange={() => false}
							placeholder='XML'
							readOnly
							value={xlmVal}
						/>
					</Form.Group>
					<Button
						fluid
						onClick={() => {
							this.convertCurrency(usdVal);
						}}
						primary
						size='large'
						type='submit'
					>
						USD <Icon name='arrow right' />
						<span style={{ marginLeft: '15px' }}>XML</span>
					</Button>
				</Form>
			</div>
		);

		const ExistingWalletModal = (
			<Modal
				centered={false}
				dimmer='blurring'
				onClose={this.toggleExistingModal}
				open={existingWalletModalOpen}
				size='small'
			>
				<Header size='large' style={{ textAlign: 'center' }}>
					{text.authenticate}
					<Header.Subheader>{text.enterPrivateKey}</Header.Subheader>
				</Header>
				<Modal.Content>
					<Form size='large'>
						<Form.Field>
							<Input
								icon='lock'
								iconPosition='left'
								onChange={this.onChangeSecretKey}
								placeholder={text.enterPrivateKey}
								value={secretKeyVal}
							/>
						</Form.Field>
						<Form.Field>
							<Button
								color='blue'
								disabled={secretKeyVal.length !== 56}
								fluid
								onClick={() => {
									const login = this.getAccountInfo(secretKeyVal);
									if (login) {
										this.toggleExistingModal();
									}
								}}
								size='large'
							>
								{text.unlock}
							</Button>
						</Form.Field>
					</Form>
				</Modal.Content>
			</Modal>
		);

		const NewWalletModal = (
			<Modal
				centered={false}
				onClose={this.toggleNewModal}
				open={newWalletModalOpen}
				size='large'
			>
				<Header dividing size='large' style={{ textAlign: 'center' }}>
					{text.yourWalletInfo}
				</Header>
				<Modal.Content>
					<Form
						error
						onSubmit={() => {
							const qrCode = this.generateSecret();
							this.props.setWalletInfo({
								address: publicKey,
								data: {},
								exists: false,
								qrCode,
								secretKey
							});
							this.toggleNewModal();
						}}
						size='large'
					>
						<Form.Field>
							<label>{text.publicKey}</label>
							<Input error icon='rocket' iconPosition='left' readOnly value={publicKey} />
						</Form.Field>
						<Form.Field>
							<label>{text.secretKey}</label>
							<Input error icon='lock' iconPosition='left' readOnly value={secretKey} />
						</Form.Field>
						<Message
							content={text.acctWarningContent}
							error
							header={text.acctWarningHeader}
							size='small'
						/>
						<Button
							color='green'
							fluid
							size='large'
							type='submit'
						>
							<Icon name='checkmark' />
							{text.completeSetup}
						</Button>
					</Form>
				</Modal.Content>
			</Modal>
		);

		const Footer = (
			<Segment className='footerSegment' inverted vertical style={{ padding: '3em 0em' }}>
				<Container style={{ width: '100%' }}>
					<Grid divided inverted stackable>
						<Grid.Row>
							<Grid.Column width={3}>
								<Header inverted as='h4' content={text.connect} />
								<List link inverted>
									<List.Item as='a'>{text.about}</List.Item>
									<List.Item as='a'>{text.contactUs}</List.Item>
								</List>
							</Grid.Column>
							<Grid.Column width={13}>
								<Header as='h4' inverted>
									Stellar Secure
								</Header>
								<p>
									{text.madeFooterText} {' '} <Flag name='de' />
								</p>
								<p style={{ wordBreak: 'break-all' }}>
									{text.donate}: GCOQAWJHY3ROVKLU7TAE75LC524SCARFA4EOBRSTVGY4G2TRNYJZ4GJ2
								</p>
							</Grid.Column>
						</Grid.Row>
					</Grid>
					<p style={{ fontSize: '1em', marginTop: '25px' }}>
						© {text.copyright} 2019, {siteName} - {text.notAffiliated}
					</p>
				</Container>
			</Segment>
		);

		const HomepageHeading = ({ mobile, props }) => (
			<Container
				className='HeroContainer'
				fluid
				style={{ marginLeft: '0 !important' }}
			>
				<Header
					as='h1'
					content='Stellar Secure'
					inverted
					style={{
						fontSize: mobile ? '2em' : '4em',
						fontWeight: 'normal',
						marginBottom: 0
					}}
				/>
				<Header
					as='h2'
					content={text.heroSubheader}
					inverted
					style={{
						fontSize: mobile ? '1.5em' : '1.7em',
						fontWeight: 'normal',
						marginTop: mobile ? '0.5em' : '12em'
					}}
				/>
				<Button
					color='green'
					onClick={() => {
						this.createWallet();
						this.generateSecret();
						this.toggleNewModal();
					}}
					size='huge'
				>
					{text.createWallet}
				</Button>
				<Button
					color='blue'
					onClick={() => {
						this.toggleExistingModal();
					}}
					size='huge'
				>
					{text.existingWallet}
				</Button>
			</Container>
		);

		const RenderTransactions = () => {
			if (this.props.wallet.records) {
				return this.props.wallet.records.map((r, i) => {
					const srcAcct = r.type === 'create_account' ? r.account : r.to;
					const memo = r.asset_type === 'native' ? 'MEMO_TEXT' : r.asset_code;
					return (
						<Table.Row key={r.id}>
							<Table.Cell
								style={{ workBreak: 'break-word' }}
							>
								{srcAcct}
							</Table.Cell>
							<Table.Cell
								negative={srcAcct !== this.props.wallet.account_id}
								positive={srcAcct === this.props.wallet.account_id}
							>
								{r.type === 'create_account' ? r.starting_balance : r.amount} XLM
							</Table.Cell>
							<Table.Cell>
								{r.type === 'create_account' ? 'CREATE_ACCOUNT' : memo}
							</Table.Cell>
							<Table.Cell>
								<Moment date={r.created_at} fromNow />
							</Table.Cell>
							<Table.Cell>
								{r.id}
							</Table.Cell>
						</Table.Row>
					);
				});
			};
			return null;
		};

		const SendXLMForm = (
			<div>
				<Header attached='top' size='huge'>
					{capitalize(text.send)} Stellar
				</Header>
				<Form
					as={Segment}
					attached
					error={sendError}
					loading={this.props.formLoading}
					size='large'
					success={showToast}
				>
					<Form.Group widths='equal'>
						<Form.Field>
							<Input
								icon='rocket'
								iconPosition='left'
								onChange={this.onChangeAddress}
								placeholder={text.addressPlaceholder}
								value={addressVal}
							/>
						</Form.Field>
						<Form.Field>
							<Input
								icon='usd'
								iconPosition='left'
								onChange={this.onChangeAmount}
								placeholder={text.amountPlaceholder}
								value={amountVal}
							/>
						</Form.Field>
					</Form.Group>
					<Form.Field>
						<Input
							icon='pencil'
							iconPosition='left'
							maxLength={28}
							onChange={this.onChangeMemo}
							placeholder={text.memoPlaceholder}
							value={memoVal}
						/>
					</Form.Field>
					<Message error content={sendErrorMsg} />
					<Message success content={text.toastMsg} icon='check' />
					<Button
						color='green'
						disabled={amountVal > 0 && !isNaN(amountVal) && addressVal.length === 56 ? false : true}
						fluid
						onClick={() => this.sendPayment(amountVal, addressVal, memoVal)}
						size='large'
						type='submit'
					>
						{capitalize(text.send)}
					</Button>
				</Form>
			</div>
		);

		const TFAForm = (
			<Container style={{ minHeight: '500px', paddingTop: '20px' }} text>
				<Header attached='top' size='huge' textAlign='center'>
					{text.enterTfaCode}
				</Header>
				<Segment attached basic>
					<Form
						error={timeCodeError}
						onSubmit={() => this.submitTimeCode(timeCode)}
					>
						<Form.Field>
							<Input
								maxLength={6}
								onChange={this.onChangeTimeCode}
								placeholder={text.tfaPlaceholder}
								value={timeCode}
							/>
						</Form.Field>
						<Message
							content={text.incorrectCodeMsg}
							error
						/>
						<Button
							color='blue'
							disabled={timeCode.length !== 6}
							fluid
							type='submit'
						>
							{text.submit}
						</Button>
					</Form>
				</Segment>
			</Container>
		);

		const TFASegment = (
			<div>
				<Header attached='top' size='huge'>
					{text.tfaSegmentHeader}
				</Header>
				<Segment attached clearing>
					<div style={{ float: 'right' }}>
						<label className="radio-label">{this.props.tfaEnabled ? 'On' : 'Off'}</label>
						<Radio
							checked={this.props.tfaEnabled}
							onClick={this.toggleQrCode}
							toggle
						/>
					</div>
					<Grid stackable>
						<Grid.Row>
							<Grid.Column textAlign='center' width={3}>
								{this.props.wallet.qrCode && (
									<QRCode
										value={this.generateUri(this.decrypt(this.props.wallet.qrCode))}
									/>
								)}
							</Grid.Column>
							<Grid.Column width={10}>
								<Header>
									{text.tfaMsgHeader}
									<Header.Subheader>
										{text.tfaMsgContent}
										For more info on how to set up, click <a href='https://chrome.google.com/webstore/detail/authenticator/bhghoamapcdpbohphigoooaddinpkbai?hl=en' rel='noopener noreferrer' target='_blank'>here</a>
									</Header.Subheader>
								</Header>
							</Grid.Column>
						</Grid.Row>
					</Grid>
				</Segment>
			</div>
		);

		const WalletOverview = (
			<div className='walletOverview'>
				<Header style={{ marginTop: '0.5em', wordBreak: 'break-all' }}>
					<b>{this.props.wallet.publicKey}</b>
					<Header.Subheader>
						{text.addressSubheader}
					</Header.Subheader>
				</Header>
				<Segment stacked style={{ marginBottom: '1.5em' }}>
					<Segment className='pricesSegment' placeholder>
						<Grid columns={3} divided stackable textAlign='center'>
							<Grid.Row>
								<Grid.Column>
									<Header as='h2'>
										{round(this.props.balance, 2)}
										<Header.Subheader><Icon color='blue' name='rocket' size='small' />XLM</Header.Subheader>
									</Header>
								</Grid.Column>

								<Grid.Column>
									<Header>
										{round(this.props.balance*this.props.currentPrices.usd, 2)}
										<Header.Subheader><Flag name='us' />USD</Header.Subheader>
									</Header>
								</Grid.Column>

								<Grid.Column>
									<Header>
										{round(this.props.balance*this.props.currentPrices.eur, 2)}
										<Header.Subheader><Flag name='eu' />EUR</Header.Subheader>
									</Header>
								</Grid.Column>
							</Grid.Row>
						</Grid>
					</Segment>

					{!exists && (
						<Message
							content={text.inactiveContent}
							header={text.inactiveHeader}
							info
						/>
					)}

					{TFASegment}
					<Divider />

					{SendXLMForm}
					<Divider />

					{ConversionSegment}

					{exists && (
						<div>
							<Divider />
							<Header attached='top' size='huge' style={{ marginTop: '0' }}>
								{text.transactions}
							</Header>
							<Table attached style={{ wordBreak: 'break-all' }}>
								<Table.Header>
									<Table.Row>
										<Table.HeaderCell>Account ID</Table.HeaderCell>
										<Table.HeaderCell>Amount</Table.HeaderCell>
										<Table.HeaderCell>Memo</Table.HeaderCell>
										<Table.HeaderCell>Date</Table.HeaderCell>
										<Table.HeaderCell>Operation ID</Table.HeaderCell>
									</Table.Row>
								</Table.Header>
								<Table.Body style={{ width: '100%' }}>
									{RenderTransactions()}
								</Table.Body>
							</Table>
						</div>
					)}

					<Divider />

					<Header attached='top' size='huge' style={{ marginTop: '0' }} >
						{text.price}
					</Header>
					<Segment
						attached
						loading={this.props.chartData.length === 0}
					>
						{chartData.length > 0 ? (
							<div>
								<Label.Group className='rangeSelector' size='large'>
									<Label
										onClick={() => {
											const ts = Math.round(new Date().getTime());
											const start = ts - ((24*3600)*1000);
											this.props.getHistoricalPrices({ currency: 'USD', start, end: new Date().getTime() })
										}}
									>
										1d
									</Label>
									<Label
										onClick={() => {
											const ts = Math.round(new Date().getTime());
											const start = ts - (((24*3600)*7)*1000);
											this.props.getHistoricalPrices({ currency: 'USD', start, end: new Date().getTime() })
										}}
									>
										1w
									</Label>
									<Label
										onClick={() => {
											const ts = Math.round(new Date().getTime());
											const start = ts - (((24*3600)*30)*1000);
											this.props.getHistoricalPrices({ currency: 'USD', start, end: new Date().getTime() })
										}}
									>
										1m
									</Label>
									<Label
										onClick={() => {
											const ts = Math.round(new Date().getTime());
											const start = ts - (((24*3600)*365)*1000);
											this.props.getHistoricalPrices({ currency: 'USD', start, end: new Date().getTime() })
										}}
									>
										1y
									</Label>
								</Label.Group>
								<Chart
									chartType='AreaChart'
									data={chartData}
									height={'350px'}
									loader={<div>Loading Chart</div>}
									options={{
										chartArea: { height: '70%', width: '100%' },
										hAxis: {
											title: 'Date',
											titleTextStyle: {
												size: '11px',
												color: '#333'
											}
										},
										lineWidth: 5,
										title: '',
										vAxis: {
											minValue: 0
										}
									}}
									rootProps={{ 'data-testid': '1' }}
									width={'100%'}
								/>
							</div>
						) : (
							<div style={{ height: '250px' }}>
								<Placeholder.Line />
								<Placeholder.Line />
								<Placeholder.Line />
							</div>
						)}
					</Segment>
				</Segment>
			</div>
		);

		const trigger = (
			<span>
				Language
			</span>
		);

		return (
			<Provider store={store}>
				<Responsive
					getWidth={getWidth}
					maxWidth={Responsive.onlyMobile.maxWidth}
				>
					<Segment
						inverted
						style={{ minHeight: authenticated ? 0 : 350, padding: '0em' }}
						textAlign={authenticated ? 'left' : 'center'}
						vertical
					>
						<Menu
							className='menuHeader'
							inverted
							pointing
							secondary
							size='large'
						>
							<Menu.Item
								className='headerItem'
								onClick={() => window.location.reload()}
							>
								<Icon color='green' name='rocket' />
								{siteName}
							</Menu.Item>
							<Menu.Item position='right' style={{ margin: '0' }}>
								<Dropdown
									onChange={(e, { value }) => {
										this.props.setLanguage({ lang: value });
									}}
									options={langOptions}
									style={{ marginRight: '20px' }}
									trigger={trigger}
								/>
							</Menu.Item>
						</Menu>
						{!authenticated && (
							<HomepageHeading props={this.props} />
						)}
					</Segment>

					{authenticated && (
						<div>
							{!tfaAuth && tfaEnabled ? TFAForm : WalletOverview}
						</div>
					)}
				</Responsive>

				<Responsive getWidth={getWidth} minWidth={Responsive.onlyTablet.minWidth}>
					<Visibility
						once={false}
						onBottomPassed={this.toggleFixedMenu}
						onBottomPassedReverse={this.toggleFixedMenu}
					>
						<Segment
							color='black'
							inverted
							style={{ minHeight: authenticated ? 0 : 0, padding: '0' }}
							textAlign={authenticated ? 'left' : 'center'}
							vertical
						>
							<Menu
								borderless
								className='menuHeader'
								fixed={fixed ? 'top' : null}
								inverted
								pointing={!fixed}
								secondary={!fixed}
								size='large'
								style={{ marginBottom: '8px' }}
							>
								<Container fluid>
									<Menu.Item
										className='headerItem'
										onClick={() => window.location.reload()}
										style={{ color: '#fff', fontSize: '1.3em' }}
									>
										<Icon color='green' name='rocket' />
										{siteName}
									</Menu.Item>
									<Menu.Item position='right' style={{ margin: '0' }}>
										<Dropdown
											onChange={(e, { value }) => {
												this.props.setLanguage({ lang: value });
											}}
											options={langOptions}
											position='left'
											style={{ marginRight: '30px' }}
											trigger={trigger}
										/>
										{!authenticated ? (
											<Button
												inverted
												onClick={() => {
													this.toggleExistingModal();
												}}
											>
												{text.myWallet}
											</Button>
										) : (
											<Button
												inverted
												onClick={() => {
													this.setState({
														timeCode: '',
														timeCodeError: false
													});
													this.props.logout();
												}}
											>
												{text.logout}
											</Button>
										)}
									</Menu.Item>
								</Container>
							</Menu>
							{!authenticated && (
								<HomepageHeading props={this.props} />
							)}
						</Segment>
						{authenticated && (
							<div>
								{!tfaAuth && tfaEnabled ? TFAForm : WalletOverview}
							</div>
						)}
					</Visibility>
				</Responsive>

				{!authenticated && !exists ? (
					<div>
						<Segment style={{ padding: '8em 0em' }} vertical>
							<Grid container stackable verticalAlign='middle'>
								<Grid.Row>
									<Grid.Column width={8}>
										<Header as='h3' style={{ fontSize: '2em' }}>
											{text.grids[0].header}
										</Header>
										<p style={{ fontSize: '1.33em' }}>
											{text.grids[0].content}
										</p>

										<Header as='h3' style={{ fontSize: '2em' }}>
											{text.grids[1].header}
										</Header>
										<p style={{ fontSize: '1.33em' }}>
											{text.grids[1].content}
										</p>
									</Grid.Column>
									<Grid.Column floated='right' width={6}>
										<Image size='large' src={ChartPic} />
									</Grid.Column>
								</Grid.Row>
							</Grid>
						</Segment>

						<Segment style={{ padding: '0em' }} vertical>
							<Grid celled='internally' columns='equal' stackable>
								<Grid.Row textAlign='center'>
									<Grid.Column style={{ paddingBottom: '5em', paddingTop: '5em' }}>
										<Header as='h3' style={{ fontSize: '2em' }}>
											<Icon color='blue' name='lock' />
											{text.grids[2].header}
										</Header>
										<p style={{ fontSize: '1.33em' }}>
											{text.grids[2].content}
										</p>
									</Grid.Column>
									<Grid.Column style={{ paddingBottom: '5em', paddingTop: '5em' }}>
										<Header as='h3' style={{ fontSize: '2em' }}>
											<Icon color='blue' name='qrcode' />
											{text.grids[3].header}
										</Header>
										<p style={{ fontSize: '1.33em' }}>
											{text.grids[3].content}
										</p>
									</Grid.Column>
								</Grid.Row>

								<Grid.Row textAlign='center'>
									<Grid.Column style={{ paddingBottom: '5em', paddingTop: '5em' }}>
										<Header as='h3' style={{ fontSize: '2em' }}>
											<Icon color='blue' name='tablet alternate' />
											{text.grids[4].header}
										</Header>
										<p style={{ fontSize: '1.33em' }}>
											{text.grids[4].content}
										</p>
									</Grid.Column>
									<Grid.Column style={{ paddingBottom: '5em', paddingTop: '5em' }}>
										<Header as='h3' style={{ fontSize: '2em' }}>
											<Icon color='blue' name='line graph' />
											{text.grids[5].header}
										</Header>
										<p style={{ fontSize: '1.33em' }}>
											{text.grids[5].content}
										</p>
									</Grid.Column>
									<Grid.Column style={{ paddingBottom: '5em', paddingTop: '5em' }}>
										<Header as='h3' style={{ fontSize: '2em' }}>
											<Icon color='blue' name='clock outline' />
											{text.grids[6].header}
										</Header>
										<p style={{ fontSize: '1.33em' }}>
											{text.grids[6].content}
										</p>
									</Grid.Column>
								</Grid.Row>
							</Grid>
						</Segment>

						<Segment style={{ padding: '8em 0em' }} textAlign='center' vertical>
							<Container text>
								<Header as='h3' style={{ fontSize: '2em' }}>
									{text.contactHeader}
								</Header>
								<p style={{ fontSize: '1.33em' }}>
									{text.contactMsg}
								</p>
								<p style={{ fontSize: '1.33em' }}>
									email@mail.com
								</p>
								<Icon color='blue' name='mail' size='huge' />
							</Container>
						</Segment>
						{ExistingWalletModal}
						{NewWalletModal}
					</div>
				) : null}
				{Footer}
			</Provider>
		);
	};
};

App.defaultProps = {
	addressVal: '',
	amountVal: '',
	balance: '0',
	chartData: [],
	currentPrices: {
		eur: 0,
		usd: 0
	},
	exists: false,
	formLoading: false,
	getBalances,
	getCurrentPrice,
	getHistoricalPrices,
	getTransactions,
	lang: 'en',
	memoVal: '',
	logout,
	name: 'Your Stellar Wallet',
	sendStellar,
	setAddressVal,
	setAmountVal,
	setLanguage,
	setMemoVal,
	setToInitial,
	setWalletInfo,
	showToast: false,
	text: textJson.en,
	tfaEnabled: false,
	toggleFormLoading,
	toggleQrCode,
	toggleTfaAuth
};

App.propTypes = {
	addressVal: PropTypes.string,
	amountVal: PropTypes.string,
	authenticated: PropTypes.bool,
	balance: PropTypes.string,
	chartData: PropTypes.array,
	currentPrices: PropTypes.shape({
		eur: PropTypes.number,
		usd: PropTypes.number
	}),
	exists: PropTypes.bool,
	formLoading: PropTypes.bool,
	getBalances: PropTypes.func,
	getCurrentPrice: PropTypes.func,
	getHistoricalPrices: PropTypes.func,
	getTransactions: PropTypes.func,
	lang: PropTypes.string,
	memoVal: PropTypes.string,
	name: PropTypes.string,
	logout: PropTypes.func,
	prices: PropTypes.array,
	privateKey: PropTypes.string,
	publicKey: PropTypes.string,
	qrCode: PropTypes.string,
	sendStellar: PropTypes.func,
	setAddressVal: PropTypes.func,
	setAmountVal: PropTypes.func,
	setLanguage: PropTypes.func,
	setMemoVal: PropTypes.func,
	setToInitial: PropTypes.func,
	setWalletInfo: PropTypes.func,
	showToast: PropTypes.bool,
	text: PropTypes.object,
	toggleFormLoading: PropTypes.func,
	toggleQrCode: PropTypes.func,
	toggleTfaAuth: PropTypes.func,
	transactions: PropTypes.array,
	tfaAuth: PropTypes.bool,
	tfaEnabled: PropTypes.bool,
	uniqueId: PropTypes.string,
	wallet: PropTypes.object
};

const mapStateToProps = (state, ownProps) => ({
	...state,
	...ownProps
});

export default connect(
	mapStateToProps,
	{
		getBalances,
		getCurrentPrice,
		getHistoricalPrices,
		getTransactions,
		logout,
		sendStellar,
		setAddressVal,
		setAmountVal,
		setLanguage,
		setMemoVal,
		setWalletInfo,
		setToInitial,
		toggleFormLoading,
		toggleQrCode,
		toggleTfaAuth
	}
)(App);
