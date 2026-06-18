/** Qur'anic "verse of the day" set used by the top-bar marquee ticker. */
export interface Verse {
  ar: string;
  en: string;
  ref: string;
}

export const VERSES: Verse[] = [
  { ar: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', en: 'Indeed, with hardship comes ease.', ref: 'Ash-Sharh 94:6' },
  { ar: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا', en: 'Whoever fears Allah — He will make a way out for him.', ref: 'At-Talaq 65:2' },
  { ar: 'وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ', en: 'Cooperate in righteousness and piety.', ref: "Al-Ma'idah 5:2" },
  { ar: 'وَقُل رَّبِّ زِدْنِي عِلْمًا', en: 'My Lord, increase me in knowledge.', ref: 'Ta-Ha 20:114' },
  { ar: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', en: 'Indeed, Allah is with the patient.', ref: 'Al-Baqarah 2:153' },
];
