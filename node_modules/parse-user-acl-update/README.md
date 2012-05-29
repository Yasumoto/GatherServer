Update ACLs on Parse objects for newly created users
=====================================

Share objects that were created before a user made an account. 

When users update ACLs for objects on Parse, they won't be able to share with users that have not made an account yet. This module can be plugged into a server, and called with the userId and emailAddress associated with an object so it can be shared as soon as the account gets created.

Mad props to the heroku node sample application.

Run locally
-----------

Copy the App ID and Secret from your Parse dashboard into your `.env`:

    echo PARSE_APP_ID=12345 >> .env
    echo PARSE_MASTER_KEY=abcde >> .env

