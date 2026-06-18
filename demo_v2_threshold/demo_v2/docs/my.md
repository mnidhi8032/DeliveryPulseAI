JWT - JSON Web Token

    JWT (JSON Web Token) is used in login systems mainly to prove that a user is authenticated without storing session data on the server.
        - temporary office ID card
        - JWT does not contain password.
        - JWT only stores lightweight information

        System creates: 
        {
            "user_id":"123",
            "role":"PM",
            "exp":"tomorrow"
        }

    JWT is basically the temporary digital ID card given after login.

                    Login once
                        ↓
                    Get token
                        ↓
                    Use token everywhere



                    Browser
                    ↓
                    FastAPI
                    ↓
                    JWT verification
                    ↓
                    Database
                    ↓
                    Permission check

    JWT is a signed authentication token used to identify users and carry temporary access information after login without asking for credentials repeatedly.