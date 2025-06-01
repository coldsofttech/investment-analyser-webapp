let auth0Client = null;

const configureAuth0Client = async() => {
    if (auth0Client) return;

    const response = await fetch(`${getRootPath()}/static/js/auth0-config.json`);
    const config = await response.json();
    auth0Client = await auth0.createAuth0Client({
        domain: config.domain,
        clientId: config.clientId,
        cacheLocation: "localstorage",
        useRefreshTokens: true
    });
};

const isAuth0Authenticated = async() => {
    return await auth0Client.isAuthenticated();
};

const updateAuth0UI = async() => {
    const isAuthenticated = await auth0Client.isAuthenticated();
    if (isAuthenticated) {
        window.location.href = `${getRootPath()}menu.html`;
    }
};

const loginAuth0 = async() => {
    console.log(`${window.location.origin}${getRootPath()}menu.html`);
    await auth0Client.loginWithRedirect({
        authorizationParams: {
            redirect_uri: `${window.location.origin}/${getRootPath()}/menu.html`
        }
    });
};

const logoutAuth0 = async() => {
    await auth0Client.logout({
        logoutParams: {
            returnTo: `${window.location.origin}/${getRootPath()}/index.html`
        }
    });
};

const handleAuth0RedirectCallback = async() => {
    const query = window.location.search;
    if (query.includes("code=") && query.includes("state=")) {
        try {
            await auth0Client.handleRedirectCallback();
            updateAuth0UI();
            window.history.replaceState({}, document.title, `/${getRootPath()}/menu.html`);
        } catch (err) {
            const msg = encodeURIComponent(err.error_description || err.message || "Unknown login error.");
            window.location.href = `/${getRootPath()}/index.html?error=${msg}`;
        }
    }
};

const requireAuth = async() => {
    const isAuthenticated = await auth0Client.isAuthenticated();
    if (!isAuthenticated) {
        const msg = encodeURIComponent("Unable to authenticate. Please contact the administrator.");
        window.location.href = `/${getRootPath()}/index.html?error=${msg}`;
    }
};

const getAuth0UserInfo = async() => {
    return await auth0Client.getUser();
};

const verifyAuth0Authentication = async() => {
    await configureAuth0Client();
    await handleAuth0RedirectCallback();
    await requireAuth();
}

async function initLoginButton() {
    $('#login').on('click', function (e) {
        e.preventDefault();
        loginAuth0();
    });
}

async function initLogoutButton() {
    $('#logout').on('click', function (e) {
        e.preventDefault();
        logoutAuth0();
    });
}