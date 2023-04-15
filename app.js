const express = require('express');
const serverless = require('serverless-http');
var cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const port = process.env.PORT || 5000;

const Board = require('./models/Board');
const Column = require('./models/Column');
const Task = require('./models/Task');
const Subtask = require('./models/Subtask');

const app = express();

app.use(cors());

app.use(bodyParser.json());

app.use(
  '/graphql',
  graphqlHTTP({
    schema: buildSchema(`
        type Board {
            _id: ID!
            name: String!
            columns: [Column!]
        }

        type Column {
            _id: ID!
            name: String
            board: Board!
            tasks: [Task!]
        }

        type Task {
            _id: ID!
            title: String!
            description: String
            column: Column!
            subtasks: [Subtask!]!
        }

        type Subtask {
            _id: ID!
            title: String!
            isCompleted: Boolean!
            task: Task!
        }

        input SubtaskInput {
            title: String!
        }

        type RootQuery {
            board(id: String): Board!
            boards: [Board!]!
            column(id: String): Column!
            task(id: String): Task!
        }

        type RootMutation {
            createBoard(name: String): Board
            updateBoard(id: String, name: String): Board
            deleteBoard(id: String!): Board
            createColumn(name: String, board: String): Column
            updateColumn(id: String!, name: String!): Column
            deleteColumn(id: String!): Column
            createTask(title: String!, column: String!, description: String, subtasks: [SubtaskInput]!): Task
            updateTask(id: String!, column: String, title: String, description: String): Task
            deleteTask(id: String!): Task
            createSubtask(title: String!, task: String!): Subtask
            updateSubtask(id: String!, title: String, isCompleted: Boolean): Subtask
            deleteSubtask(id: String!): Subtask
        }

        schema {
            query: RootQuery
            mutation: RootMutation
        }
    `),
    rootValue: {
      board: async (args) => {
        return await Board.findById(args.id)
          .populate({
            path: 'columns',
            populate: { path: 'tasks', populate: { path: 'subtasks' } },
          })
          .then((board) => {
            return board;
          })
          .catch((err) => {
            throw err;
          });
      },
      createBoard: async (args) => {
        const board = new Board({
          name: args.name,
        });
        return await board
          .save()
          .then((result) => {
            return { ...result._doc };
          })
          .catch((err) => {
            throw err;
          });
      },
      updateBoard: async (args) => {
        return await Board.findById(args.id)
          .then((board) => {
            board.name = args.name;
            return board.save();
          })
          .catch((err) => {
            throw err;
          });
      },
      deleteBoard: async (args) => {
        let deletedBoard;
        return await Board.findByIdAndDelete(args.id)
          .then((board) => {
            deletedBoard = board;
            return Task.find({ column: { $in: deletedBoard.columns } });
          })
          .then((tasks) => {
            for (let i = 0; i < tasks.length; i++) {
              const task = tasks[i];
              return Subtask.deleteMany({ task: task._id });
            }
          })
          .then(() => {
            return Task.deleteMany({ column: { $in: deletedBoard.columns } });
          })
          .then(() => {
            return Column.deleteMany({ board: deletedBoard._id });
          })
          .then(() => deletedBoard)
          .catch((err) => {
            throw err;
          });
      },
      boards: async () => {
        return await Board.find()
          .then((boards) => {
            return boards.map((board) => {
              return { ...board._doc };
            });
          })
          .catch((err) => {
            throw err;
          });
      },
      column: async (args) => {
        return await Column.findById(args.id).catch((err) => {
          throw err;
        });
      },
      createColumn: async (args) => {
        const column = new Column({
          name: args.name,
          board: args.board,
        });
        let createdColumn;
        return await column
          .save()
          .then((result) => {
            createdColumn = { ...result._doc };
            return Board.findById(args.board);
          })
          .then((board) => {
            board.columns.push(createdColumn._id);
            return board.save();
          })
          .then(() => createdColumn)
          .catch((err) => {
            throw err;
          });
      },
      updateColumn: async (args) => {
        return await Column.findById(args.id)
          .then((column) => {
            column.name = args.name;
            return column.save();
          })
          .catch((err) => {
            throw err;
          });
      },
      deleteColumn: async (args) => {
        let deletedColumn;
        return await Column.findByIdAndDelete(args.id)
          .then((column) => {
            deletedColumn = column;
            return Board.findByIdAndUpdate(column.board, {
              $pull: { columns: column._id },
            });
          })
          .then(() => {
            return Task.deleteMany({ column: deletedColumn._id });
          })
          .then(() => {
            return Subtask.deleteMany({ task: { $in: deletedColumn.tasks } });
          })
          .then(() => deletedColumn)
          .catch((err) => {
            throw err;
          });
      },
      task: async (args) => {
        return await Task.findById(args.id)
          .populate('column subtasks')
          .then((task) => {
            return { ...task._doc };
          })
          .catch((err) => {
            throw err;
          });
      },
      createTask: async (args) => {
        const createdTask = new Task({
          title: args.title,
          description: args.description,
          column: args.column,
        });
        return await createdTask
          .save()
          .then((task) => {
            return Column.findByIdAndUpdate(task.column, {
              $push: { tasks: task._id },
            });
          })
          .then(() => {
            return args.subtasks.forEach((subtask) => {
              const createdSubtask = new Subtask({
                title: subtask.title,
                task: createdTask._id,
              });
              return createdSubtask
                .save()
                .then((subtask) => {
                  return Task.findByIdAndUpdate(subtask.task, {
                    $push: { subtasks: subtask._id },
                  });
                })
                .then(() => createdSubtask)
                .catch((err) => {
                  throw err;
                });
            });
          })
          .then(() => createdTask)
          .catch((err) => {
            throw err;
          });
      },
      updateTask: async (args) => {
        let updatedTask;
        return await Task.findById(args.id)
          .then((task) => {
            updatedTask = task;
            if (task.title !== args.title) updatedTask.title = args.title;
            if (task.description !== args.description)
              updatedTask.description = args.description;
            if (task.column !== args.column) {
              return Column.findByIdAndUpdate(task.column, {
                $pull: { tasks: task._id },
              })
                .then(() =>
                  Column.findByIdAndUpdate(args.column, {
                    $push: { tasks: task._id },
                  })
                )
                .then(() => (updatedTask.column = args.column));
            }
            return updatedTask;
          })
          .then(() => updatedTask.save())
          .catch((err) => {
            throw err;
          });
      },
      deleteTask: async (args) => {
        let deletedTask;
        return await Task.findByIdAndDelete(args.id)
          .then((task) => {
            deletedTask = task;
            return Subtask.deleteMany({ task: task._id });
          })
          .then(() => {
            return Column.findByIdAndUpdate(deletedTask.column, {
              $pull: { tasks: deletedTask._id },
            });
          })
          .then(() => deletedTask)
          .catch((err) => {
            throw err;
          });
      },
      createSubtask: async (args) => {
        const subtask = new Subtask({
          title: args.title,
          task: args.task,
        });
        let createdSubtask;
        return await subtask
          .save()
          .then((result) => {
            createdSubtask = { ...result._doc };
            return Task.findByIdAndUpdate(args.task, {
              $push: { subtasks: result._id },
            });
          })
          .then(() => createdSubtask)
          .catch((err) => {
            throw err;
          });
      },
      updateSubtask: async (args) => {
        return await Subtask.findByIdAndUpdate(args.id, {
          $set: { isCompleted: args.isCompleted, title: args.title },
        }).catch((err) => {
          throw err;
        });
      },
      deleteSubtask: async (args) => {
        let deletedSubtask;
        return await Subtask.findByIdAndDelete(args.id)
          .then((subtask) => {
            deletedSubtask = subtask;
            return Task.findByIdAndUpdate(subtask.task, {
              $pull: { subtasks: subtask._id },
            });
          })
          .then(() => deletedSubtask)
          .catch((err) => {
            throw err;
          });
      },
    },
    graphiql: true,
  })
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    app.listen(port, console.log(`Server running on port ${port}`));
  })
  .catch((err) => console.error(err));
