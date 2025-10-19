'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { auth } from '../better-auth/auth';
import {headers} from 'next/headers'
import {redirect } from 'next/navigation'
import { success, symbol } from 'better-auth';

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
  if (!email) return [];

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection not found');

    // Better Auth stores users in the "user" collection
    const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) return [];

    const userId = (user.id as string) || String(user._id || '');
    if (!userId) return [];

    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    console.error('getWatchlistSymbolsByEmail error:', err);
    return [];
  }
}

export async function addToWatchlist(symbol:string,company:string):Promise<string[]>{

  try{
    const session= await auth.api.getSession({
      headers: await headers()
    })

     if (!session?.user) redirect('/sign-in');

    // Check if stock already exists in watchlist
    const existingItem = await Watchlist.findOne({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
    });

    if (existingItem) {
      return { success: false, error: 'Stock already in watchlist' };
    }

    // Add to watchlist
    const newItem = new Watchlist({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
      company: company.trim(),
    });

    await newItem.save();
    revalidatePath('/watchlist');

    return { success: true, message: 'Stock added to watchlist' };
  }catch (error) {
    console.error('Error adding to watchlist:', error);
    throw new Error('Failed to add stock to watchlist');
  }

}

export const removeFromWatchlist=async (symbol:string,company:string) =>{
  try{
    const session= await auth.api.getSession({
      headers: await headers()
    })

    if(!session?.user) redirect('/sign-in')

      await Watchlist.deleteOne({
        userId:session.user.id,
        symbol:symbol.toUpperCase()
      })
      revalidatePath('/watchlist')

      return {success:true ,message:'Stock removed from watchlist'}
  }
  catch(e){
    console.error('Error removing from watchlist',e);
    throw new Error ('Failed to remove from the watchlist ')
  }
}