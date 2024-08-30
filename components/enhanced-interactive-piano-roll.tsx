'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = 5;
const MEASURES = 4;
const BEATS_PER_MEASURE = 4;
const CELL_SIZE = 25;
const NOTE_WIDTH = CELL_SIZE;
const NOTE_HEIGHT = CELL_SIZE;
const SELECTED_NOTE_COLOR = '#88178F';
const NOTE_COLOR = '#276C9E';

const allNotes = Array.from({ length: OCTAVES }, (_, octave) =>
  NOTES.map(note => `${note}${OCTAVES - octave}`)
).flat().reverse();

interface Note {
  id: string;
  note: string;
  start: number;
  duration: number;
  rowIndex: number;
  colIndex: number;
  selected: boolean;
}

const Piano: React.FC<{
  activeNotes: string[];
  onNotePlay: (note: string) => void;
  onNoteStop: (note: string) => void;
}> = ({ activeNotes, onNotePlay, onNoteStop }) => {
  return (
    <div className="w-20 flex-shrink-0 mr-1">
      {allNotes.map((note) => (
        <div
          key={note}
          className={`h-6 flex items-center ${
            note.includes('#')
              ? 'bg-gray-900 text-white justify-center'
              : 'bg-white text-gray-900 justify-end pr-2'
          } ${activeNotes.includes(note) ? 'bg-blue-500' : ''}`}
          onMouseDown={() => onNotePlay(note)}
          onMouseUp={() => onNoteStop(note)}
          onMouseLeave={() => onNoteStop(note)}
        >
          <span className="text-xs">{note}</span>
        </div>
      ))}
    </div>
  );
};

const drawGrid = (ctx: CanvasRenderingContext2D, numberOfRows: number, numberOfColumns: number) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.beginPath();
  for (let row = 0; row < numberOfRows; row++) {
    for (let col = 0; col < numberOfColumns; col++) {
      ctx.rect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
  ctx.strokeStyle = 'lightgray';
  ctx.stroke();
};

const drawNote = (ctx: CanvasRenderingContext2D, note: Note) => {
  const x = note.colIndex * NOTE_WIDTH;
  const y = note.rowIndex * NOTE_HEIGHT;
  const width = NOTE_WIDTH * note.duration;
  const height = NOTE_HEIGHT;
  const noteColor = note.selected ? SELECTED_NOTE_COLOR : NOTE_COLOR;

  ctx.fillStyle = noteColor;
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = 'white';
  ctx.font = '10px Arial';
  ctx.fillText(note.note, x + 2, y + height / 2 + 4);
};

const EnhancedInteractivePianoRoll: React.FC = () => {
  const [synth, setSynth] = useState<Tone.PolySynth | null>(null);
  const [activeNotes, setActiveNotes] = useState<string[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [numberOfColumns, setNumberOfColumns] = useState(MEASURES * BEATS_PER_MEASURE * 4);

  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const notesCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const newSynth = new Tone.PolySynth(Tone.Synth).toDestination();
    setSynth(newSynth);

    return () => {
      newSynth.dispose();
    };
  }, []);

  const drawAllNotes = useCallback(() => {
    if (!notesCanvasRef.current) return;
    const ctx = notesCanvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    notes.forEach(note => drawNote(ctx, note));
  }, [notes]);

  useEffect(() => {
    if (!gridCanvasRef.current) return;
    const ctx = gridCanvasRef.current.getContext('2d');
    if (!ctx) return;

    drawGrid(ctx, allNotes.length, numberOfColumns);
  }, [numberOfColumns]);

  useEffect(() => {
    drawAllNotes();
  }, [drawAllNotes]);

  const playNote = useCallback((note: string) => {
    if (synth) {
      synth.triggerAttack(note);
      setActiveNotes(prev => [...prev, note]);
    }
  }, [synth]);

  const stopNote = useCallback((note: string) => {
    if (synth) {
      synth.triggerRelease(note);
      setActiveNotes(prev => prev.filter(n => n !== note));
    }
  }, [synth]);

  const handleNotePlay = (note: string) => {
    playNote(note);
  };

  const handleNoteStop = (note: string) => {
    stopNote(note);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!notesCanvasRef.current) return;
    const rect = notesCanvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const colIndex = Math.floor(x / CELL_SIZE);
    const rowIndex = Math.floor(y / CELL_SIZE);

    const clickedNote = notes.find(note =>
      note.rowIndex === rowIndex &&
      colIndex >= note.colIndex &&
      colIndex < note.colIndex + note.duration
    );

    if (clickedNote) {
      setSelectedNote(clickedNote);
      setNotes(prevNotes => prevNotes.map(note => ({
        ...note,
        selected: note.id === clickedNote.id
      })));
    } else if (!isDragging) {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        note: allNotes[rowIndex],
        start: colIndex,
        duration: 1,
        rowIndex,
        colIndex,
        selected: true,
      };
      setNotes(prevNotes => [...prevNotes.map(note => ({ ...note, selected: false })), newNote]);
      setSelectedNote(newNote);
      playNote(newNote.note);

      if (colIndex >= numberOfColumns - 1) {
        setNumberOfColumns(prevCols => prevCols + 50);
      }
    }

    drawAllNotes();
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!notesCanvasRef.current) return;
    const rect = notesCanvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const colIndex = Math.floor(x / CELL_SIZE);
    const rowIndex = Math.floor(y / CELL_SIZE);

    const clickedNote = notes.find(note =>
      note.rowIndex === rowIndex &&
      colIndex >= note.colIndex &&
      colIndex < note.colIndex + note.duration
    );

    if (clickedNote) {
      setSelectedNote(clickedNote);
      setIsDragging(true);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && selectedNote && notesCanvasRef.current) {
      const rect = notesCanvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const newColIndex = Math.floor(x / CELL_SIZE);
      const newRowIndex = Math.floor(y / CELL_SIZE);

      setNotes(prevNotes => prevNotes.map(note =>
        note.id === selectedNote.id
          ? { ...note, colIndex: newColIndex, rowIndex: newRowIndex, note: allNotes[newRowIndex] }
          : note
      ));

      drawAllNotes();
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const playRecorded = useCallback(() => {
    if (synth && !isPlaying) {
      setIsPlaying(true);
      Tone.Transport.cancel();
      Tone.Transport.stop();
      Tone.Transport.position = 0;

      const now = Tone.now();
      notes.forEach(({ note, start, duration }) => {
        synth.triggerAttackRelease(note, duration * 0.25, now + start * 0.25);
      });

      const maxDuration = Math.max(...notes.map(n => n.start + n.duration)) * 0.25;
      Tone.Transport.schedule(() => {
        setIsPlaying(false);
      }, maxDuration);

      Tone.Transport.start();
    }
  }, [synth, notes, isPlaying]);

  const stopPlayback = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    setIsPlaying(false);
    if (synth) {
      synth.releaseAll();
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <div className="flex mb-4 flex-wrap">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2 mb-2"
          onClick={() => Tone.start()}
        >
          Start Audio Context
        </button>
        <button
          className={`${isPlaying ? 'bg-red-500 hover:bg-red-700' : 'bg-green-500 hover:bg-green-700'} text-white font-bold py-2 px-4 rounded mr-2 mb-2`}
          onClick={isPlaying ? stopPlayback : playRecorded}
        >
          {isPlaying ? 'Stop' : 'Play Recorded'}
        </button>
      </div>
      <div className="flex">
        <Piano
          activeNotes={activeNotes}
          onNotePlay={handleNotePlay}
          onNoteStop={handleNoteStop}
        />
        <div className="relative">
          <canvas
            ref={gridCanvasRef}
            width={numberOfColumns * CELL_SIZE}
            height={allNotes.length * CELL_SIZE}
            className="absolute top-0 left-0 z-0"
          />
          <canvas
            ref={notesCanvasRef}
            width={numberOfColumns * CELL_SIZE}
            height={allNotes.length * CELL_SIZE}
            className="absolute top-0 left-0 z-10"
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </div>
    </div>
  );
};

export default EnhancedInteractivePianoRoll;