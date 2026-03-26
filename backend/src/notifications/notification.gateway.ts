import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(NotificationGateway.name)
  private readonly userToSocket = new Map<string, string>()
  private readonly socketToUser = new Map<string, string>()

  afterInit() {
    this.logger.log('Notification gateway initialized')
  }

  handleConnection(@ConnectedSocket() socket: Socket) {
    const userIdRaw = socket.handshake.query.userId
    const userId = typeof userIdRaw === 'string' ? userIdRaw : Array.isArray(userIdRaw) ? userIdRaw[0] : undefined
    if (!userId) {
      this.logger.warn(`Socket connected without userId: ${socket.id}`)
      return
    }

    this.userToSocket.set(userId, socket.id)
    this.socketToUser.set(socket.id, userId)
    this.logger.log(`User connected userId=${userId} socketId=${socket.id}`)
  }

  handleDisconnect(@ConnectedSocket() socket: Socket) {
    const userId = this.socketToUser.get(socket.id)
    if (userId) {
      this.userToSocket.delete(userId)
      this.socketToUser.delete(socket.id)
      this.logger.log(`User disconnected userId=${userId} socketId=${socket.id}`)
    }
  }

  sendToUser(userId: string, event: string, data: any): void {
    const socketId = this.userToSocket.get(userId)
    if (!socketId) {
      this.logger.log(`User ${userId} not connected`)
      return
    }
    this.server.to(socketId).emit(event, { ...data, timestamp: new Date().toISOString() })
  }
}

