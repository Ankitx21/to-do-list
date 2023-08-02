const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Schema = mongoose.Schema; // Add this line to import the Schema class
const _= require("lodash");
const dotenv = require('dotenv');
dotenv.config();

// Rest of your code here...


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));


mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});


const itemsSchema = new Schema({
  name: String, // Change STRING to String
});

const listSchema = new Schema({
  name: String,
  items: [itemsSchema]
})

const Item = mongoose.model("Item", itemsSchema);
const List = mongoose.model("List",listSchema);

const listArray = [];

async function addList() {
  try {
    const foundItems = await Item.find({});

    if (foundItems.length === 0) {
      const item1 = new Item({
        name: "to do list",
      });

      const item2 = new Item({
        name: "Hit the + button to add items",
      });

      const item3 = new Item({
        name: "check items to remove it",
      });

      const defaultItems = [item1, item2, item3];

      await Item.insertMany(defaultItems);
      console.log("Successfully saved default items to DB");
    } else {
      console.log("Default items already exist. Skipping insertion.");
    }
  } catch (error) {
    console.log(error);
  }
}

// Call the function to add default items on server start
addList();

app.get("/", async function(req, res) {
  try {
      const foundItems = await Item.find({});

        res.render("list", {listTitle: "Today", newListItems:foundItems});
    } catch (error) {
      console.log(error);
    };
});

app.get("/:customListName", async function(req, res) {
  const customListName = _.capitalize(req.params.customListName);

  try {
    let list = await List.findOne({ name: customListName });

    if (!list) {
      // If the custom list doesn't exist, create a new one with the customListName and empty items array
      list = new List({
        name: customListName,
        items: listArray,
      });
      await list.save();
      console.log(`Created a new list "${customListName}".`);
    } else {
      console.log(`List "${customListName}" already exists.`);
    }

    res.render("list", { listTitle: customListName, newListItems: list.items });
  } catch (error) {
    console.log(error);
    res.status(500).send("Error retrieving list from the database.");
  }
});


app.post("/", async function(req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list; // Corrected to lowercase listName (previously ListName)

  if (listName === "Today") {
    // If the listName is "Today", add the item to the default route ("/") and redirect to the home page
    const item = new Item({
      name: itemName,
    });
    await item.save();
    console.log(`Added item "${itemName}" to the default list.`);
    res.redirect("/");
  } else {
    // If the listName is a custom list title, find the list and add the item to it
    try {
      let list = await List.findOne({ name: listName });

      if (list) {
        const item = new Item({
          name: itemName,
        });
        list.items.push(item);
        await list.save();
        console.log(`Added item "${itemName}" to list "${listName}".`);
      } else {
        console.log(`List "${listName}" not found.`);
      }

      res.redirect("/" + listName); // Redirect back to the custom list route
    } catch (error) {
      console.log(error);
      res.status(500).send("Error adding item to the list.");
    }
  }
});


app.post("/delete", async function (req, res) {
  const checkedItemId = req.body.check;
  const listName = req.body.listName;

  try {
    if (listName === "Today") {
      // If the listName is "Today", remove the item from the default list
      await Item.findByIdAndRemove(checkedItemId);
      console.log("Successfully deleted the checked item from the default list.");
      res.redirect("/");
    } else {
      // If the listName is a custom list title, use $pull to remove the item from the custom list
      await List.updateOne({ name: listName }, { $pull: { items: { _id: checkedItemId } } });
      console.log(`Successfully deleted the checked item from list "${listName}".`);
      res.redirect("/" + listName);
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Error deleting item.");
  }
});




app.get("/about", function(req, res){
  res.render("about");
});

// Close the Mongoose server gracefully when the Node.js server is shutting down
process.on('SIGINT', function() {
  mongoose.connection.close(function () {
    console.log('Mongoose default connection disconnected through app termination');
    process.exit(0);
  });
});

app.listen(process.env.PORT || 3000, function() {
  console.log("Server started on port 3000");
});