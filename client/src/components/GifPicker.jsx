import React, { useState } from 'react';
import { Search, X, Image as ImageIcon, Sparkles, TrendingUp, Heart, Smile } from 'lucide-react';

const CURATED_GIFS = [
  // Trending / Greetings
  { id: 'g1', title: 'Hello Wave', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1eHNtd3Z6dDJlcWF5Y3I0d2x5cnhmb2M3aDVyZ29mdnU0bW5qayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/mG2lq7U4cO87Z6Y0wE/giphy.gif', tags: ['hello', 'hi', 'wave', 'greeting'] },
  { id: 'g2', title: 'Cosmic Space', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeGJwZnA1dnh4bzN0OTFhOHc5Y3Z1cWNpdzFzcjR1N3N1bmdicjR2dyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3oEjI6SIIHBdRxXI40/giphy.gif', tags: ['space', 'universe', 'stars', 'galaxy', 'cosmic'] },
  { id: 'g3', title: 'Thumbs Up Cool', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', tags: ['thumbsup', 'yes', 'agree', 'cool', 'nice'] },
  { id: 'g4', title: 'Mind Blown', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', tags: ['mindblown', 'wow', 'shock', 'amazing'] },
  { id: 'g5', title: 'Celebrate Dance', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', tags: ['party', 'celebrate', 'dance', 'happy'] },
  { id: 'g6', title: 'Popcorn Chill', url: 'https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif', tags: ['popcorn', 'watching', 'chill', 'lounge'] },
  { id: 'g7', title: 'Cat Typing Fast', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', tags: ['typing', 'coding', 'fast', 'work', 'cat'] },
  { id: 'g8', title: 'Heart Love', url: 'https://media.giphy.com/media/26FLdmIp6wJr91JAI/giphy.gif', tags: ['love', 'heart', 'hug', 'thanks'] },
  { id: 'g9', title: 'Rocket Launch', url: 'https://media.giphy.com/media/3o7btQ8jDTPGDpgc6I/giphy.gif', tags: ['rocket', 'launch', 'speed', 'beacon', 'space'] },
  { id: 'g10', title: 'LOL Laughing', url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif', tags: ['laugh', 'lol', 'funny', 'haha'] },
  { id: 'g11', title: 'Matrix Code', url: 'https://media.giphy.com/media/eIm624c8nnNbiG0V3g/giphy.gif', tags: ['matrix', 'code', 'hacker', 'tech'] },
  { id: 'g12', title: 'Clapping Bravo', url: 'https://media.giphy.com/media/l3q2XhfQ8oCkm1GhO/giphy.gif', tags: ['clap', 'bravo', 'congrats', 'cheers'] },
];

const CATEGORIES = ['All', 'Space', 'Reactions', 'Happy', 'Work', 'Fun'];

export default function GifPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');

  const filteredGifs = CURATED_GIFS.filter((gif) => {
    const matchesSearch =
      !search.trim() ||
      gif.title.toLowerCase().includes(search.toLowerCase()) ||
      gif.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesCat =
      selectedCat === 'All' ||
      gif.tags.some((t) => t.toLowerCase() === selectedCat.toLowerCase());

    return matchesSearch && matchesCat;
  });

  return (
    <div className="absolute bottom-full mb-3 right-0 sm:right-auto sm:left-12 z-50 w-72 sm:w-96 bg-zinc-950/95 border border-white/20 rounded-2xl shadow-2xl backdrop-blur-2xl p-3.5 msg-in select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <span className="font-playfair italic font-bold text-xs text-white flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-white" />
          <span>Send Animated GIF</span>
        </span>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="my-2.5 relative flex items-center">
        <Search className="absolute left-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search GIFs (e.g. space, hi, lol)…"
          className="w-full bg-zinc-900/80 border border-white/15 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/40 font-sans"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 custom-scroll">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCat(cat)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all ${
              selectedCat === cat
                ? 'bg-white text-black font-bold shadow-sm shadow-white/30'
                : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* GIF Grid */}
      <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 custom-scroll">
        {filteredGifs.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-xs text-zinc-500 font-playfair italic">
            No matching GIFs found. Try another keyword.
          </div>
        ) : (
          filteredGifs.map((gif) => (
            <button
              key={gif.id}
              type="button"
              onClick={() => onSelect(gif.url, gif.title)}
              className="group relative rounded-xl overflow-hidden border border-white/15 hover:border-white transition-all transform hover:scale-[1.03] bg-zinc-900 aspect-video"
            >
              <img
                src={gif.url}
                alt={gif.title}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <span className="text-[10px] text-white font-mono truncate">{gif.title}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
