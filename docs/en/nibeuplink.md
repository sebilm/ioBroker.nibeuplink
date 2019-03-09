# ioBroker.nibeuplink

This adapter is still in development. You can use it but without support and help. Later I will document it here.

This ioBroker adapter receives data from a Nibe heat pump from Nibe Uplink.

## Using this adapter

1. You need a Nibe heat pump - bye one if you don't have ;-)
2. You need an account at Nibe Uplink: https://www.nibeuplink.com/
3. After logging in you have an URL in this form: https://www.nibeuplink.com/System/XXXXX/Status/Overview
4. Instead of XXXXX there is a number. This is your System ID. We need this ID.
5. Go to Nibe Uplink Api: https://api.nibeuplink.com/Account/LogIn and log in
6. Click "MY APPLICATIONS" and then "Create application"
7. Fill in: Name and Description can be everything e.g. ioBroker
8. The Callback URL is important. You can use https://z0mt3c.github.io/nibe.html
9. Accept the NIBE Uplink API Services Agreement and click "Create application"
10. Then you get an Identifier and a Secret - we need them
11. Install this adapter in ioBroker
12. At adapter setting page fill in the Identifier and the Secret.
13. Click the link "Click here to generate the Auth Code on NIBE Uplink."
14. Follow the instructions. At the end you get your nibe-fetcher code
15. Copy this code and paste it in the adapter settings at "Auth Code".
16. Fill in your System ID from Nibe Uplink URL.
17. Choose your language.
18. Click Save and Close

If you (later) get a "400 bad request" error in the log, you must get a new Auth Code - so do numbers 13 until 15 and 18.
