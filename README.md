# climatecoin-backend

We use Strapi (https://strapi.io/) as CMS for ClimateCoin.

# How to install

* First, create MongoDB container executing:
  
  ```docker-compose up -d```

* Next, you must create your .env file copying .env.example file and make sure you use correct data in the following variables (data used when you created previous database):
  
  ```
  DATABASE_PORT=270127
  DATABASE_NAME=project
  DATABASE_USERNAME=guest
  DATABASE_PASSWORD=guest
  ```

* Then you can install project requirements:
  
  ```yarn```

* And finally, execute this command to start strapi:
  
  ```yarn develop```

* If all it is correct, you could navigate to http://localhost:1337/admin/ to see your strapi in action!

# Tests

```export DEBUG=nock.* && yarn test```

# Volumes

Create the volume on the server and mount it in `/opt/public/uploads`

# User authentication
>The authentication process for the users is handled by making them sign a challenge transaction and verifying it later.

```mermaid
sequenceDiagram
participant Usr as User
participant Front as Frontend <br> (WebApp)
participant Back as Backend <br> (Strapi)
autonumber

    activate Usr
    Usr->>+Front: Wallet selection<br>and connection
    deactivate Usr

    activate Front
    Front->>+Back: Request challenge txn
    deactivate Front

    activate Back
    note right of Back: A 16 byte Token is generated for the request<br>The token is put in a 0 Algos transaction note<br>The txn needs to be signed by the user
    Back->>+Front: Send unsigned challenge txn
    deactivate Back 
    
    activate Front
    Front->>+Usr: Request txn sign
    deactivate Front
    
    activate Usr
    note left of Usr: Wait for user to sign
    Usr->>+Front: Sign txn
    deactivate Usr

    activate Front
    Front->>+Back: Send challenge txn signed
    deactivate Front

    activate Back
    note right of Back: The transaction is decoded<br>The signature of the transaction is verified<br>The Token on the note is verified
    note right of Back: A user is created if it does not exist already
    Back->>+Front: Send JWT
    deactivate Back 
```

# User wallet creation
>The backend will send 1 Algos to the user's wallet when they register on the app using Magiclink.
>This will enable their wallets to be able to use them in algorand blockchain.
>The amount given to the new user is configurable with the enviroment variable `ALGOS_TO_NEW_USER=1`

# Carbon-Document Workflow

## Creating the request
>The user submits all the information required in the form, and it is saved on Strapi.
```mermaid
sequenceDiagram
participant Usr as User
participant Front as Frontend <br> (WebApp)
participant Back as Backend <br> (Strapi)
autonumber

    activate Usr
    Usr->>+Front: Credits information
    deactivate Usr

    activate Front
    Front->>+Back: Send Credits information
    deactivate Front

    activate Back
    note right of Back: Create carbon-document request on Strapi
    deactivate Back 
```

## Credits received
>Climate has received the credits, carbon-document NFT will be issued
```mermaid
sequenceDiagram
    participant User as User
    participant Front as Frontend <br> (WebApp)
    participant CL as Climate
    participant Back as Backend <br> (Strapi)
    participant BC as Algorand <br> Block Chain
    autonumber
    
    activate CL
    note left of CL: Complete vertification
    CL->>+Back: Set state `completed`
    CL->>+Back: Mint NFT
    deactivate CL
    
    activate Back
    Back->>+BC: Mint NFT
    note right of BC: Part of the NFT is kept by climate as a<br>commision, configured by method<br>`set_fee` of the vault contract
    deactivate Back

    activate User 
    User->>+Front: Claim Project NFT
    deactivate User

    activate Front
    Front->>+Back: Request claim
    deactivate Front

    activate Back
    note left of Back: Create Group of Txns <br> Sign Creator Txns
    Back->>+Front: Send Unsigned Txns
    deactivate Back 

    activate Front 
    note right of Front: Sign User Txns
    Front->>+Back: Send Signed Txns
    deactivate Front

    activate Back
    note left of Back: Send Group Txns to Blockchain
    Back->>+BC: Optin of user to Project NFT
    Back->>+BC: Move NFT to user address
    note right of BC: The NFT is freezed on the user account
    deactivate Back
```

## Swap for Climatecoins
>The user swaps the project NFT to get Climatecoins
>>In this step, the frontend will automatically opt the user in to climatecoin if they have not opted-in already
```mermaid
sequenceDiagram
    participant User as User
    participant Front as Frontend <br> (WebApp)
    participant Back as Backend <br> (Strapi)
    participant BC as Algorand <br> Block Chain
    autonumber

    activate User 
    User->>+Front: Swap NFT
    deactivate User

    activate Front
    Front->>+Back: Request swap
    deactivate Front

    activate Back
    note left of Back: Create Group of Txns <br> Sign Creator Txns
    Back->>+Front: Send Unsigned Txns
    deactivate Back 

    activate Front 
    note right of Front: Sign User Txns
    Front->>+Back: Send Signed Txns
    deactivate Front

    activate Back
    note left of Back: Send Group Txns to Blockchain
    Back->>+BC: Optin of user to Climatecoins
    Back->>+BC: Move NFT to vault app
    Back->>+BC: Send Climatecoins to user address
    deactivate Back
```

# Compensation Workflow

## Creating the burn
>On this workflow the user creates a compensation request and sends the funds to a new burn deploy contract until it is revised. <br>
>At the moment of the creation of the group transactions (steps 2->3) the backend decides which carbon document NFTs will get burned if the transaction gets approved by climate. <br>
>>- The NFTs that get burned are selected by getting the oldest ones first, based on the field `credit_start` of the NFT.<br>
>>- A maximum of 5 NFTs can be burned at the same time due to Algorand limitations.<br>
>>- The moment the NFTs are selected, they get locked by the backend for (by default) 10 minutes. This prevents multiple users getting the same NFTs to burn. 
>>- The amount of minutes can be configured using an environment variable `MAX_MINUTES_TO_BURN=10`
```mermaid
sequenceDiagram
    participant Usr as User
    participant Front as Frontend <br> (WebApp)
    participant Back as Backend <br> (Strapi)
    participant BC as Algorand <br> Block Chain
    autonumber
    
    activate Usr
    note left of Usr: Start compensation
    Usr->>+Front: Set CC amount to burn
    deactivate Usr

    activate Front
    Front->>+Back: Send CC amount
    deactivate Front

    activate Back
    note right of Back: Create Group of Txns <br> Save the group id
    Back->>+Front: Send Unsigned Txns
    deactivate Back 

    activate Front 
    note left of Front: Sign User Txns
    Front->>+Back: Send Signed Txns
    deactivate Front

    activate Back
    note right of Back: Verify group id and sign transactions
    note right of Back: Send Group Txns to Blockchain
    Back->>+BC: Transfer of CC from user add to Vault add
    Back->>+BC: Send Algos to cover burn contract opt ins
    Back->>+BC: Set Burn Parameters
    Back->>+BC: Deploy burn
    note right of BC: A new burn contract is deployed. <br> (ID stored on compensation at Strapi)
    note right of BC: Climatecoins and Carbon-Doc NFTs <br> are sent to the burn contract.
    deactivate Back
```

## Approving the burn
>On this workflow climate has approved the compensation by:
>1. Updating the state of it to `received_certificates`
>2. Uploading the certificates to `registry_certificates`
>3. Minting the NFT
>
>The moment the NFT is minted, the burn contract is closed and approved.
>
>Once the compensation has been minted it cannot be undone.
```mermaid
sequenceDiagram
    participant CL as Climate
    participant Back as Backend <br> (Strapi)
    participant Usr as User
    participant Front as Frontend <br> (WebApp)
    participant BC as Algorand <br> Block Chain
    autonumber
    
    activate CL
    note left of CL: Approve compensation
    CL->>+Back: Set state `received_certificates`
    CL->>+Back: Set certificate in `registry_certificates`
    CL->>+Back: Mint certificate
    deactivate CL

    activate Back
    Back->>+BC: Mint certificate NFT
    note right of Back: Certificate is uploaded to IPFS
    deactivate Back

    activate User 
    User->>+Front: Claim certificate NFT
    deactivate User

    activate Front
    Front->>+Back: Prepare claim
    deactivate Front

    activate Back
    note left of Back: Create Group of Txns <br> Sign Creator Txns
    Back->>+Front: Send Unsigned Txns
    deactivate Back 

    activate Front 
    note right of Front: Sign User Txns
    Front->>+Back: Send Signed Txns
    deactivate Front

    activate Back
    note left of Back: Send Group Txns to Blockchain
    Back->>+BC: Optin of user to certificate NFT
    Back->>+BC: Approve burn
    note right of BC: At approval, the burn contract sends <br>the NFTs to the dump and the CC<br>and remaining Algos back to the vault
    note right of BC: The burn contract opts in to the <br> certificate NFT before closing <br> to track the certificate generated <br> with that burn on the blockchain
    note right of BC: The NFT certificate is sent to the user
    deactivate Back
```

## Rejecting the burn
>On this workflow climate has decided to reject the compensation request by:
>1. Updating the state of it to `rejected`
>
> The backend will automatically reject the burn in the blockchain, returning NFTs to Climate and CC to the user
```mermaid
sequenceDiagram
    participant CL as Climate
    participant Back as Backend <br> (Strapi)
    participant BC as Algorand <br> Block Chain
    autonumber
    
    activate CL
    note left of CL: Reject compensation
    CL->>+Back: Set state `rejected`
    deactivate CL

    activate Back
    note left of Back: Create and sign reject txn
    note left of Back: Send txn to Blockchain
    Back->>+BC: Reject burn
    note right of BC: At rejection, the burn contract sends <br>the NFTs and Algos back to climate and <br>the CC back to the user address.
    deactivate Back
```
