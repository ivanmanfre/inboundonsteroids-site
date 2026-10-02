(() => {
  const campaign = new URLSearchParams(window.location.search);
  const selected = {
    utm_source: 'chatgpt_app',
    utm_medium: 'plugin',
    utm_campaign: 'linkedin_patterns',
  };

  if (!Object.entries(selected).every(([key, value]) => {
    const found = campaign.getAll(key);
    return found.length === 1 && found[0] === value;
  })) return;

  for (const link of document.querySelectorAll('a[href]')) {
    const url = new URL(link.href);
    if (url.hostname !== 'calendly.com' || url.pathname !== '/im-ivanmanfredi/30min') continue;
    for (const [key, value] of Object.entries(selected)) url.searchParams.set(key, value);
    link.href = url.href;
  }
})();
