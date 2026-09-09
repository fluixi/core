/**
 * The devtools page. Its only job is to offer the panel.
 *
 * Created unconditionally: whether the inspected page is a Fluixi application is not known
 * until its runtime has loaded, and a panel that appears halfway through a session is worse
 * than one that says the page is not one.
 */
chrome.devtools.panels.create('Fluixi', '', 'panel.html');
