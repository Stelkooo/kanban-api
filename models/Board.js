const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

const boardSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  columns: [
    {
      type: ObjectId,
      ref: 'Column',
    },
  ],
});

module.exports = mongoose.model('Board', boardSchema);
