nextjs
react
supabase
postmark for emails


anything that has a .env key in it shall be behind /api, even if its just a function that uses it to export something, make a /lib in the /api.

structure each api endpoint such that even if its just pulling data that the user has permission to see that data.


we should use jwt login/ validation.

we will be using supabase managed password store, so do not try to recreate your own.

we will be doing email validation/ password resets with postmark emails.

we will be using webhooks with twilio anywhere were we can espesically in relation to message reading.

please always prompt me if you are creating a new table so i can audit it.