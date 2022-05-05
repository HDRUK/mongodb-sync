### Program to sync databases

#### Steps below on how to RUN

- Use the script like this:

  ```bash
  ./mongo-sync PROD_URI=test LOCAL_URI=local LOCAL_DB=localdb COLLECTIONS=users,teams,tools
  ```

#### Docker commdand to run

Build:

`docker build -t image_name . `

RUN:
`docker run -i -t image_name PROD_URI=mongodb+srv://user:pwd@host/db LOCAL_URI=mongodb+srv://user:pwd@host/db LOCAL_DB=localdb COLLECTIONS=users,teams,tools `
