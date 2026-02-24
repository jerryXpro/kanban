import { login, signup } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message: string }>
}) {
    const { message } = await searchParams;

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 relative p-4">
            {/* Background Graphic */}
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" style={{ backgroundSize: '30px 30px', backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)' }}></div>

            <Card className="w-full max-w-sm z-10 shadow-xl border-slate-200/60 bg-white/80 backdrop-blur-xl">
                <form>
                    <CardHeader className="space-y-1 text-center pb-6">
                        <CardTitle className="text-2xl font-bold tracking-tight">Kanban Workspace</CardTitle>
                        <CardDescription className="text-slate-500">
                            Enter your email below to login or create an account
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="m@example.com" required className="bg-white/50" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" required className="bg-white/50" />
                        </div>
                        {message && (
                            <div className="p-3 text-sm bg-red-50 text-red-600 rounded-md border border-red-100 mt-4">
                                {message}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-3">
                        <Button formAction={login} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all hover:shadow">
                            Log in
                        </Button>
                        <Button formAction={signup} variant="outline" className="w-full border-slate-200 bg-white/50 hover:bg-slate-50 transition-colors">
                            Sign up
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
