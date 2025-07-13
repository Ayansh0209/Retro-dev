const express = require('express')
const app = express()
const port = 3000
const authRoutes = require('./routes/auth')
const gitRoutes = require('./routes/git')
const githubRoutes = require('./routes/github')
const cors = require('cors');

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.use('/auth',authRoutes);
app.use('/git',gitRoutes);
app.use('/github', githubRoutes);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
