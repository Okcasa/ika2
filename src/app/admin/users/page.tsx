'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Header } from '@/components/header';
import { AppUser, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const USERS_KEY = 'leadsorter_users';

export default function UserManagementPage() {
    const { users, setUsers, username: currentUsername } = useAuth();
    const [newUsername, setNewUsername] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('regular');
    const { toast } = useToast();
    const router = useRouter();

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUsername.trim()) {
            toast({ variant: 'destructive', title: 'Username cannot be empty.' });
            return;
        }
        if (users.some(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
            toast({ variant: 'destructive', title: 'Username already exists.' });
            return;
        }

        const newUser: AppUser = {
            id: `user-${Date.now()}`,
            username: newUsername.trim(),
            role: newRole,
        };

        const updatedUsers = [...users, newUser];
        setUsers(updatedUsers);
        localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
        
        toast({ title: 'User added successfully!', className: 'bg-accent text-accent-foreground' });
        setNewUsername('');
    };

    const handleDeleteUser = (userId: string) => {
        const userToDelete = users.find(u => u.id === userId);
        if (userToDelete?.username === currentUsername) {
            toast({ variant: 'destructive', title: "You cannot delete yourself." });
            return;
        }
        
        const updatedUsers = users.filter(u => u.id !== userId);
        setUsers(updatedUsers);
        localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
        toast({ title: 'User deleted.' });
    };

    return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 py-8">
        <Header />
        <div className="mt-8 max-w-4xl mx-auto">
            <Button variant="outline" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Add, remove, and manage user roles.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddUser} className="flex items-end gap-4 mb-8">
                        <div className="flex-grow">
                            <label htmlFor="new-username" className="text-sm font-medium">Username</label>
                            <Input
                                id="new-username"
                                placeholder="Enter new username"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                            />
                        </div>
                         <div>
                            <label htmlFor="new-role" className="text-sm font-medium">Role</label>
                            <Select value={newRole} onValueChange={(value: UserRole) => setNewRole(value)}>
                                <SelectTrigger className="w-[180px]" id="new-role">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="regular">Regular</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="submit">Add User</Button>
                    </form>

                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.username}</TableCell>
                                        <TableCell>{user.role}</TableCell>
                                        <TableCell className="text-right">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleDeleteUser(user.id)}
                                                disabled={user.username === currentUsername}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
      </main>
      <footer className="text-center py-4">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} LeadSorter Pro. All rights reserved.</p>
      </footer>
    </div>
    )
}
