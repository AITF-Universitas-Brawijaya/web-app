"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api"

const fetcher = async (url: string) => await apiGet(url)

interface User {
    id: number
    username: string
    full_name: string
    email?: string
    phone?: string
    role: string
    created_at: string
    last_login?: string
}

export default function UserManagementSection() {
    const { data: users, mutate } = useSWR<User[]>("/api/admin/users", fetcher, {
        refreshInterval: 0,
        revalidateOnFocus: true,
    })

    const [showModal, setShowModal] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        full_name: "",
        email: "",
        phone: "",
    })
    const [loading, setLoading] = useState(false)

    const handleOpenModal = (user?: User) => {
        if (user) {
            setEditingUser(user)
            setFormData({
                username: user.username,
                password: "",
                full_name: user.full_name,
                email: user.email || "",
                phone: user.phone || "",
            })
        } else {
            setEditingUser(null)
            setFormData({
                username: "",
                password: "",
                full_name: "",
                email: "",
                phone: "",
            })
        }
        setShowModal(true)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setEditingUser(null)
        setFormData({
            username: "",
            password: "",
            full_name: "",
            email: "",
            phone: "",
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (editingUser) {
                // Update user
                const updateData: any = {
                    full_name: formData.full_name,
                    email: formData.email || null,
                    phone: formData.phone || null,
                }
                if (formData.password) {
                    updateData.password = formData.password
                }

                await apiPut(`/api/admin/users/${editingUser.id}`, updateData)
                alert("User updated successfully")
            } else {
                // Create user
                await apiPost("/api/admin/users", {
                    username: formData.username,
                    password: formData.password,
                    full_name: formData.full_name,
                    email: formData.email || null,
                    phone: formData.phone || null,
                })
                alert("User created successfully")
            }

            mutate()
            handleCloseModal()
        } catch (err: any) {
            alert(`Failed to ${editingUser ? "update" : "create"} user: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (userId: number, username: string) => {
        if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
            return
        }

        try {
            await apiDelete(`/api/admin/users/${userId}`)
            alert("User deleted successfully")
            mutate()
        } catch (err: any) {
            alert(`Failed to delete user: ${err.message}`)
        }
    }

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Verifikator Management</h2>
                <Button onClick={() => handleOpenModal()}>Add User</Button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left p-2">Username</th>
                            <th className="text-left p-2">Full Name</th>
                            <th className="text-left p-2">Email</th>
                            <th className="text-left p-2">Phone</th>
                            <th className="text-left p-2">Created</th>
                            <th className="text-left p-2">Last Login</th>
                            <th className="text-right p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users?.map((user) => (
                            <tr key={user.id} className="border-b hover:bg-muted/50">
                                <td className="p-2">{user.username}</td>
                                <td className="p-2">{user.full_name}</td>
                                <td className="p-2">{user.email || "-"}</td>
                                <td className="p-2">{user.phone || "-"}</td>
                                <td className="p-2">{new Date(user.created_at).toLocaleDateString()}</td>
                                <td className="p-2">
                                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : "-"}
                                </td>
                                <td className="p-2 text-right">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="mr-2"
                                        onClick={() => handleOpenModal(user)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDelete(user.id, user.username)}
                                    >
                                        Delete
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {!users || users.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No users found</div>
                ) : null}
            </div>

            {/* User Form Modal */}
            <Dialog open={showModal} onOpenChange={(open) => !open && handleCloseModal()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Username</label>
                            <Input
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                                disabled={!!editingUser}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">
                                Password {editingUser && "(leave empty to keep current)"}
                            </label>
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required={!editingUser}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Full Name</label>
                            <Input
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Phone</label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" onClick={handleCloseModal}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Saving..." : editingUser ? "Update" : "Create"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
