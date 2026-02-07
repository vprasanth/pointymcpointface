function renderInstallPage(addToSlackUrl) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Install Ack for Slack</title>
  <meta name="description" content="Install Ack in your Slack workspace.">
  <link rel="canonical" href="https://ack.bleeping.dev/slack/install">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Ack">
  <meta property="og:locale" content="en_US">
  <meta property="og:url" content="https://ack.bleeping.dev/slack/install">
  <meta property="og:title" content="Install Ack for Slack">
  <meta property="og:description" content="Install Ack in your Slack workspace.">
  <meta property="og:image" content="https://ack.bleeping.dev/logo.png">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Install Ack for Slack">
  <meta name="twitter:description" content="Install Ack in your Slack workspace.">
  <meta name="twitter:image" content="https://ack.bleeping.dev/logo.png">
  <link rel="icon" type="image/png" href="/logo.png">
  <link rel="apple-touch-icon" href="/logo.png">
  <link rel="stylesheet" href="/styles/site.css">
  <link rel="stylesheet" href="/styles/install.css">
</head>
<body class="install-page">
  <main class="container">
    <article class="card">
      <div class="brand">
        <img class="logo" src="/logo.png" alt="Ack logo">
        <h1>Install Ack for Slack</h1>
      </div>
      <p class="muted">Award points with @user++ and use /points for stats and leaderboards.</p>
      <a class="install" href="${addToSlackUrl}">
        <img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x">
      </a>
      <p class="footer">
        By installing, you agree to our <a href="/privacy">Privacy Policy</a>.
      </p>
    </article>
  </main>
</body>
</html>`;
}

module.exports = {
  renderInstallPage
};
