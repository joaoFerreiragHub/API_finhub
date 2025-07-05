// src/app.ts
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import routes from './routes' // 👈 ESTE FALTAVA

const app = express()

// Middlewares globais
app.use(cors())
app.use(helmet())
app.use(morgan('dev'))
app.use(express.json())

// 👇 Aqui está o que faltava
app.use('/api', routes)

export default app
