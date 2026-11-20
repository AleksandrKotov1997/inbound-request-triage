import { createTriageServer } from "./src/server/app.mjs";

const host = "127.0.0.1";
const port = Number(process.env.PORT || 3000);

const server = createTriageServer();
server.listen(port, host, () => {
  const address = server.address();
  if (address && typeof address !== "string") {
    console.log(`http://${host}:${address.port}`);
  }
});
