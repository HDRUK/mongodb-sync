const fs = require("fs");
var _ = require("lodash");
const { exec } = require("child_process");
var { MongoClient, ObjectId } = require("mongodb");

const express = require("express");
const app = express();
const port = 8080;

require("dotenv").config();

app.use(express.json());

function transformObject(object, existingMembers, existingNotifications) {
  existingMembers = existingMembers
    ? existingMembers.map((value) => {
        value.memberid = { $oid: ObjectId(value.memberid).toString() };
        return value;
      })
    : [];

  existingNotifications = existingNotifications
    ? existingNotifications.map((value) => {
        value._id = { $oid: ObjectId(value._id).toString() };
        return value;
      })
    : [];

  object.notifications = !_.isEmpty(object.notifications)
    ? object.notifications
    : [];

  const members = _.uniqBy(
    [...existingMembers, ...object.members],
    "memberid.$oid"
  );

  const notifications = _.uniqBy(
    [...existingNotifications, ...object.notifications],
    "_id"
  );

  if (notifications) {
    notifications.map((value) => {
      value._id = ObjectId(value._id.$oid);
    });
  }
  if (members) {
    members.map((value) => {
      roles = _.find(object.members, {
        memberid: { $oid: value.memberid.$oid },
      }).roles;
      value.roles = _.union([...roles, ...value.roles]);
      value.memberid = ObjectId(value.memberid.$oid);
      if (value.notifications) {
        value.notifications.map((v) => {
          v._id = ObjectId(v._id.$oid);
        });
      }
    });
  }

  object.members = members;
  object.notifications = notifications;

  return object;
}

function bash(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.log(error);
      }
      resolve(stdout ? stdout : stderr);
    });
  });
}

app.post("/", async (req, res) => {
  const data = req.body;

  command = `./mongo-sync.sh PROD_URI=${process.env.PROD_URI} LOCAL_URI=${
    process.env.LOCAL_URI
  } LOCAL_DB=${process.env.LOCAL_DB} COLLECTIONS=${data.collections.join(",")}`;

  out = await bash(command);

  console.log(out);

  if (fs.existsSync("teams.json")) {
    var array = fs.readFileSync("teams.json").toString().split("\n");

    (async function () {
      try {
        MongoClient.connect(process.env.LOCAL_URI).then(async (client) => {
          var db = client.db(process.env.LOCAL_DB);
          await Promise.all(
            array.map(async (i) => {
              if (i) {
                let obj = JSON.parse(i);
                const options = { upsert: true };
                try {
                  const query = { _id: ObjectId(obj._id.$oid) };
                  const findResult = await db
                    .collection("teams")
                    .find(query)
                    .toArray();
                  if (!_.isEmpty(findResult)) {
                    obj = transformObject(
                      obj,
                      findResult[0].members,
                      findResult[0].notifications
                    );
                    const update = {
                      $set: {
                        members: obj.members,
                        notifications: obj.notifications,
                      },
                    };
                    try {
                      await db
                        .collection("teams")
                        .updateOne(query, update, options);

                      console.log("update");
                    } catch (e) {
                      console.log(obj._id.$oid);
                      console.log(e);
                    }
                  } else {
                    try {
                      obj = transformObject(obj);
                      obj._id = ObjectId(obj._id.$oid);
                      await db.collection("teams").insertOne(obj);
                      console.log("insert");
                    } catch (e) {
                      console.log(e);
                    }
                  }
                } catch (e) {}
              }
            })
          );
        });
      } catch (err) {
        console.log(err);
        res.status(500);
      } finally {
        fs.unlinkSync("teams.json");
      }
    })();
  }
  return res.status(200).send();
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
