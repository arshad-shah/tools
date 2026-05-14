// components/Header.tsx
import React from 'react';

interface HeaderProps {
    fileName: string;
    rowCount: number;
    columnCount: number;
    showFileInfo: boolean;
}

const Header: React.FC<HeaderProps> = ({ fileName, rowCount, columnCount, showFileInfo }) => {
    return (
        <div className="fixed top-0 left-0 right-0 z-10 py-4 px-6 flex justify-between items-center shadow-md bg-white">
            <div className="flex items-center">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-lime-500 to-green-600">
                    DataVision
                </h1>
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-lime-100 text-lime-800">
                    CSV/TSV Analyzer
                </span>
            </div>
            
            {showFileInfo && (
                <div className="flex items-center space-x-4">
                    <div className="px-3 py-1 rounded-full text-xs font-medium bg-lime-100 text-lime-800">
                        {fileName}
                    </div>
                    <div className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {rowCount} rows
                    </div>
                    <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {columnCount} columns
                    </div>
                </div>
            )}
        </div>
    );
};

export default Header;