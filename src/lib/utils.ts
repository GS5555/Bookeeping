import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a number to words in Indian Numbering System.
 * Appends 'Only' exactly once to the end.
 */
export const numberToWordsInr = (num: number): string => {
    if (num === 0) return "Zero Only";
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];
    
    const toWords = (n: number, s: string): string => {
        let str = '';
        if (n > 19) {
            str += b[Math.floor(n / 10)] + a[n % 10];
        } else {
            str += a[n];
        }
        if (n !== 0) {
            str += s;
        }
        return str;
    };

    let n = Math.floor(num);
    let out = '';
    out += toWords(Math.floor(n / 10000000), 'Crore ');
    n %= 10000000;
    out += toWords(Math.floor(n / 100000), 'Lakh ');
    n %= 100000;
    out += toWords(Math.floor(n / 1000), 'Thousand ');
    n %= 1000;
    out += toWords(Math.floor(n / 100), 'Hundred ');
    n %= 100;
    
    if (n > 0) {
        if(out.length > 0) {
            out += 'and ';
        }
        out += toWords(n, '');
    }

    const finalString = out.trim();
    if (finalString === '') {
        return 'Zero Only';
    }

    return finalString + ' Only';
}