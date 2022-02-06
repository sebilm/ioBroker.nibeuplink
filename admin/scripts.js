function generateURL() {
    var callbackURL = document.getElementById('CallbackURL').value;
    var identifier = document.getElementById('Identifier').value;
    document.getElementById('URL').href =
        'https://api.nibeuplink.com/oauth/authorize?response_type=code&client_id=' +
        identifier +
        '&scope=READSYSTEM%20WRITESYSTEM&redirect_uri=' +
        callbackURL +
        '&state=init';
}
