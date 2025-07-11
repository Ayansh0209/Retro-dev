const express = require('express')
const app = express()
const port = 3000
const authRoutes = require('./routes/auth')
const gitRoutes = require('./routes/git')

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.use('/auth',authRoutes);
app.use('/git',gitRoutes);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
