import 'reflect-metadata'
import mongoose, { Types } from 'mongoose'
import * as bcrypt from 'bcrypt'

import { User, UserRole, UserSchema, UserStatus } from '../users/schemas/user.schema'
import { Department, DepartmentSchema } from '../users/schemas/department.schema'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-recommendation-system'
const DEFAULT_PASSWORD = 'Amin@2002'

async function main() {
  await mongoose.connect(MONGODB_URI)

  const UserModel = mongoose.model<User>('User', UserSchema)
  const DepartmentModel = mongoose.model<Department>('Department', DepartmentSchema)
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  const hrDepartment = await DepartmentModel.findOneAndUpdate(
    { code: 'RH' },
    {
      $setOnInsert: {
        name: 'Ressources Humaines',
        code: 'RH',
        description: 'Gestion RH et talents',
      },
    },
    { upsert: true, new: true },
  )

  const techDepartment = await DepartmentModel.findOneAndUpdate(
    { code: 'DT' },
    {
      $setOnInsert: {
        name: 'Direction Technique',
        code: 'DT',
        description: 'Ingénierie et systèmes',
      },
    },
    { upsert: true, new: true },
  )

  const managerUser = await UserModel.findOneAndUpdate(
    { email: 'manager@rh.com' },
    {
      $set: {
        name: 'Manager RH',
        matricule: 'MN-9002',
        telephone: '+216 55 900 002',
        email: 'manager@rh.com',
        password: passwordHash,
        date_embauche: new Date('2021-06-15'),
        department_id: hrDepartment._id as Types.ObjectId,
        status: UserStatus.ACTIVE,
        role: UserRole.MANAGER,
        en_ligne: false,
      },
    },
    { upsert: true, new: true },
  )

  await UserModel.findOneAndUpdate(
    { email: 'rh@rh.com' },
    {
      $set: {
        name: 'Responsable RH',
        matricule: 'HR-9001',
        telephone: '+216 55 900 001',
        email: 'rh@rh.com',
        password: passwordHash,
        date_embauche: new Date('2022-01-10'),
        department_id: hrDepartment._id as Types.ObjectId,
        manager_id: managerUser._id as Types.ObjectId,
        status: UserStatus.ACTIVE,
        role: UserRole.HR,
        en_ligne: false,
      },
    },
    { upsert: true, new: true },
  )

  await UserModel.findOneAndUpdate(
    { email: 'employee@dt.com' },
    {
      $set: {
        name: 'Employe Technique',
        matricule: 'EM-9003',
        telephone: '+216 55 900 003',
        email: 'employee@dt.com',
        password: passwordHash,
        date_embauche: new Date('2023-11-01'),
        department_id: techDepartment._id as Types.ObjectId,
        manager_id: managerUser._id as Types.ObjectId,
        status: UserStatus.ACTIVE,
        role: UserRole.EMPLOYEE,
        en_ligne: false,
      },
    },
    { upsert: true, new: true },
  )

  // RH employee under RH manager
  await UserModel.findOneAndUpdate(
    { email: 'rh-employee1@rh.com' },
    {
      $set: {
        name: 'Employe RH',
        matricule: 'EM-9004',
        telephone: '+216 55 900 004',
        email: 'rh-employee1@rh.com',
        password: passwordHash,
        date_embauche: new Date('2024-01-15'),
        department_id: hrDepartment._id as Types.ObjectId,
        manager_id: managerUser._id as Types.ObjectId,
        status: UserStatus.ACTIVE,
        role: UserRole.EMPLOYEE,
        en_ligne: false,
      },
    },
    { upsert: true, new: true },
  )

  await DepartmentModel.findOneAndUpdate(
    { code: 'RH' },
    { $set: { manager_id: String(managerUser._id) } },
    { new: true },
  )

  console.log('✅ 3 comptes créés/mis à jour avec succès.')
  console.log('   - rh@rh.com / Amin@2002')
  console.log('   - manager@rh.com / Amin@2002')
  console.log('   - employee@dt.com / Amin@2002')
  console.log('   - rh-employee1@rh.com / Amin@2002')

  await mongoose.connection.close()
}

main().catch(async (err) => {
  console.error('❌ Erreur création comptes:', err)
  await mongoose.connection.close()
  process.exit(1)
})

