# OGJira Docker  

This repository contains a ready-to-use version of PSYMBIOSYS OGJira System for Docker.  

## Content  

The components inside the repository are listed below:

- **ogjira_volume**: This folder contains the docker volumes definition of all the components related to PSYMBIOSYS OGJira System.  
	- **Atlassian**: refers to  Jira Server Product. It replicates the installation directory generated after a common installation of the product.
	- **ibm_proton**: contains the [Dockerfile](ogjira_volume/ibm_proton/Dockerfile)  needed for the creation of a Docker Image. This Docker Image stores and launches the Proton Engine.
	- **java_security**: replicates the "security" folder of Java. It contains the JCE, to avoid limitation on keys length, and  the "cacert" file with all the reliable Certificates.
	- **publisher_nodejs**: as "ibm_proton" folder, it contains the  [Dockerfile](ogjira_volume/publisher_nodejs/Dockerfile) needed for the creation of a Docker Image. This Docker Image stores and launches the Publisher NodeJS used by the OGJira.xlsm file.
	- **rabbitMQ**: refers to the RabbitMQ Message Broker Docker Image. It provides the full configuration of the Broker with the elements needed by OGJira System.
	- **tomcat**: replicates the installation directory of Apache Tomcat, in which is possible to deploy web applications in the form of ".war" files [Data](ogjira_volume\tomcat\tomcat_container\tomcat\data) folder.
- **bugzilla-docker**: This folder contains Bugzilla System as Docker Version.
	-  **bsweb**: service that provides the web interface of Bugzilla
	-  **bzdb**:  service that configures and runs the DB for data storage (bugs, users, products,...)
	- **tomcat** --- **java_security**: the same as *ogjira_volume/tomcat* and *ogjira_volume/java_security* folders.
- **tools**: remaining elements needed by the end-user.
	- **OGJira.xlsm**: excel file with the macro definitions embedded.
	- **CryptographyServer.jar**: server part which exposes encryption and decryption methods invoked by OGJira.xlsm macros. For details see [Cryptography Server README.md](https://github.com/FINCONS-IBD/OGJira/blob/master/Cryptography%20Server/README.md).
	- **run CryptographyServer.bat**: batch file that starts the server.
	- **CryptographyServer-config.properties**: configuration file used by CryptographyServer.jar. Edit it with the correct info.
	- **logos**: this folder contains Jira and Bugzilla logos shown in OGJira.xlsm after the login.
- **docker-compose.yml**: YAML file used to start the entire System.

## Usage

Download the latest version of Docker from its website and start it. After the correct configuration of OGJira System, use the command line to move into the folder already downloaded and locally stored; type the following command:

`docker-compose up`

This command will automatically start all the services.  
> **Note:** For more details about the usage and the configuration, visit [OGJira GitHub Repository](https://github.com/FINCONS-IBD/OGJira)
