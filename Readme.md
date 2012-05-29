Update ACLs on Parse objects for newly created users
=====================================

Share objects that were created before a user made an account. Project written in Node.js, designed for deployment to [Heroku](http://www.heroku.com/).

Mad props to the heroku node sample application.

Run locally
-----------

Install dependencies:

    npm bundle install

Copy the App ID and Secret from your Parse dashboard into your `.env`:

    echo PARSE_APP_ID=12345 >> .env
    echo PARSE_MASTER_KEY=abcde >> .env

Change the name of the object, then you can test it out with 
    
    curl 'localhost:5000/?username=yasumoto7@gmail.com'
