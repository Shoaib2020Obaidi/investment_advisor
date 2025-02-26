How the Project Works!
----------------------
Step 01: Download [https://www.postgresql.org/download/] and Install Postgres RDBMS and during installation make sure to check the stack builder app so it will install postgis as well. 
configure PostGIS in it to deal with spatial data by running the 

Step 02: Create a database [investor] and run the below command so that the database can deal with spatial data:
         CREATE EXTENSION postgis; 

Step 03: Restore the investor.sql database backup which is available in the our GitHub repository [https://github.com/Shoaib2020Obaidi/investment_advisor] and it includes all the necessary data. 

Step 04: Download and install the Geoserver tool [https://geoserver.org/download/]
NOTE: Make sure the server Engine is running on the background and you can do that by searching on startGeoserver in your windows searchbar

Step 05: Connect Geoserver with PostGIS and before that do the following:
         - Create a workspace [investor_worspace]
         - Create a store [investor_store]
         - add files using the postgis option and in this way you can connect your store with postgis

Step 06: Download the project from our repository folder [https://github.com/Shoaib2020Obaidi/investment_advisor] and update the below information in [database.js] accordingly: 
         - username (postgres username)
         - password (postgres password)
         - database (database name in postgis)

Step 07: Open the project in your preferred code editor like VSCode and open two terminals and follow the steps bellow:
         - in terminal 1 run this command to start the node server: node server.js
	 - in terminal 2 run this command to start or open the project on the web: npm start

