const fs = require("fs");
var { MongoClient, ObjectId } = require("mongodb");
var _ = require("lodash");

var array = fs.readFileSync("teams.json").toString().split("\n");

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

(async function () {
  try {
    MongoClient.connect(process.env.LOCAL_URI)
      .then(async (client) => {
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
        process.exit(0);
      })
      .catch((err) => {
        console.log(err);
        process.exit(1);
      });
  } catch {
  } finally {
  }
})();
