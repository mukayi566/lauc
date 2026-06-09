/**
 * ─────────────────────────────────────────────────────────────
 *  shadcn/ui Component Usage Guide — Fairview App
 *  Import any of these components into your dashboard pages
 * ─────────────────────────────────────────────────────────────
 *
 * ══ CARD ══════════════════════════════════════════════════════
 *
 * import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
 *   from '@/components/ui/card'
 *
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Student Summary</CardTitle>
 *     <CardDescription>Enrolled students this semester</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     <p>1,240 students</p>
 *   </CardContent>
 *   <CardFooter>
 *     <Button variant="outline" size="sm">View all</Button>
 *   </CardFooter>
 * </Card>
 *
 *
 * ══ DIALOG (Modal) ════════════════════════════════════════════
 *
 * import { Dialog, DialogTrigger, DialogContent, DialogHeader,
 *          DialogTitle, DialogDescription, DialogFooter, DialogClose }
 *   from '@/components/ui/dialog'
 * import { Button } from '@/components/ui/button'
 *
 * <Dialog>
 *   <DialogTrigger asChild>
 *     <Button>Open Dialog</Button>
 *   </DialogTrigger>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>Confirm Action</DialogTitle>
 *       <DialogDescription>Are you sure you want to proceed?</DialogDescription>
 *     </DialogHeader>
 *     <DialogFooter>
 *       <DialogClose asChild>
 *         <Button variant="outline">Cancel</Button>
 *       </DialogClose>
 *       <Button variant="destructive">Confirm</Button>
 *     </DialogFooter>
 *   </DialogContent>
 * </Dialog>
 *
 *
 * ══ TABLE ═════════════════════════════════════════════════════
 *
 * import { Table, TableHeader, TableBody, TableHead,
 *          TableRow, TableCell, TableCaption }
 *   from '@/components/ui/table'
 *
 * <Table>
 *   <TableCaption>List of enrolled students</TableCaption>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>Name</TableHead>
 *       <TableHead>Programme</TableHead>
 *       <TableHead>Status</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>John Banda</TableCell>
 *       <TableCell>BSc Nursing</TableCell>
 *       <TableCell><Badge variant="success">Active</Badge></TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 *
 *
 * ══ POPOVER ═══════════════════════════════════════════════════
 *
 * import { Popover, PopoverTrigger, PopoverContent }
 *   from '@/components/ui/popover'
 *
 * <Popover>
 *   <PopoverTrigger asChild>
 *     <Button variant="outline">More info</Button>
 *   </PopoverTrigger>
 *   <PopoverContent>
 *     <p className="text-sm">This is a popover popup!</p>
 *   </PopoverContent>
 * </Popover>
 *
 *
 * ══ BADGE ═════════════════════════════════════════════════════
 *
 * import { Badge } from '@/components/ui/badge'
 *
 * <Badge variant="success">Active</Badge>
 * <Badge variant="destructive">Failed</Badge>
 * <Badge variant="warning">Pending</Badge>
 * <Badge variant="default">Draft</Badge>
 *
 */

export { }
