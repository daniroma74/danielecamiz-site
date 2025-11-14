-- Composer Portraits - Wikimedia Commons URLs (Public Domain)
-- Usage: sqlite3 cms/db/main.sqlite < composer_portraits.sql

-- ✅ ALREADY ADDED (7 composers):
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Beethoven.jpg/400px-Beethoven.jpg' WHERE id = 31; -- Ludwig van Beethoven
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Wolfgang-amadeus-mozart_1.jpg/400px-Wolfgang-amadeus-mozart_1.jpg' WHERE id = 34; -- Wolfgang Amadeus Mozart
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/JohannesBrahms.jpg/400px-JohannesBrahms.jpg' WHERE id = 24; -- Johannes Brahms
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Franz_Schubert_by_Wilhelm_August_Rieder_1875.jpg/400px-Franz_Schubert_by_Wilhelm_August_Rieder_1875.jpg' WHERE id = 42; -- Franz Schubert
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Edvard_Grieg_%281843-1907%29_%28ca._1888%29_by_Eilif_Peterssen.jpg/400px-Edvard_Grieg_%281843-1907%29_%28ca._1888%29_by_Eilif_Peterssen.jpg' WHERE id = 9; -- Edvard Grieg
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Antonin_Dvorak_Prague_1868.jpg/400px-Antonin_Dvorak_Prague_1868.jpg' WHERE id = 1; -- Antonin Dvořak
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Robert_Schumann_1839.jpg/400px-Robert_Schumann_1839.jpg' WHERE id = 39; -- Robert Schumann


-- 📋 TODO - High Priority Composers (add Wikimedia Commons URLs):
-- Search on: https://commons.wikimedia.org/wiki/Category:Portrait_paintings_of_composers
-- Use format: /thumb/X/XX/Filename.jpg/400px-Filename.jpg

-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 23;  -- Giuseppe Verdi
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 21;  -- Giacomo Puccini
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 36;  -- Pëtr Il'ič Tchaikovskij
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 25;  -- Johann Sebastian Bach
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 12;  -- Fryderyk Chopin
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 17;  -- Georg Friedrich Händel
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 19;  -- Gustav Mahler
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 4;   -- Felix Mendelssohn Bartholdy
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 13;  -- Franz Joseph Haydn
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 22;  -- Gioachino Rossini
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 27;  -- Johann Strauss Jr.
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 43;  -- Vincenzo Bellini
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 16;  -- Gaetano Donizetti
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 40;  -- Ottorino Respighi
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 38;  -- Pietro Mascagni


-- 📋 TODO - Medium Priority Composers:
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 2;   -- Benjamin Britten
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 3;   -- Bedřich Smetana
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 5;   -- Marco Enrico Bossi
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 6;   -- Carlos Gardel
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 7;   -- Carl Maria von Weber
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 8;   -- Camille Saint-Saëns
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 11;  -- Edward Elgar
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 18;  -- George Gershwin
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 20;  -- Giovanni Paisiello
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 26;  -- Jean Sibelius
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 29;  -- Luigi Cherubini
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 30;  -- Léo Delibes
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 32;  -- Fanny Mendelssohn
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 35;  -- Nicolaj Rimskij-Korsakov
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 41;  -- Samuel Barber
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 47;  -- Sergej Prokofiev
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 51;  -- Carl Nielsen
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 61;  -- Ennio Morricone


-- 📋 TODO - Lower Priority / Modern Composers (may not have public domain portraits):
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 49;  -- Alexandr Kostantinovič Glazunov
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 50;  -- Vasily Kalinnikov
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 52;  -- Dong-jin Kim
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 53;  -- Du-nam Cho
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 54;  -- An-sam Lee
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 55;  -- Yeon-jun Kim
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 56;  -- Young-seop Choi
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 57;  -- Kyu-hwan Kim
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 58;  -- Stanislao Gastaldon
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 59;  -- Ernesto De Curtis
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 60;  -- Salvatore Cardillo
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 62;  -- Ruggero Leoncavallo
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 63;  -- Eduardo Di Capua
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 15;  -- Francesco Sartori
-- UPDATE composers SET portrait_url = 'URL_HERE' WHERE id = 45;  -- Peter Warlock


-- HOW TO USE:
-- 1. Search for composer on Wikimedia Commons
-- 2. Find portrait in public domain (check license!)
-- 3. Copy thumbnail URL (400px version preferred)
-- 4. Uncomment line above and replace 'URL_HERE' with actual URL
-- 5. Run: sqlite3 cms/db/main.sqlite < composer_portraits.sql
-- 6. Restart staging: NODE_ENV=staging pm2 restart staging-site
-- 7. No git commit needed (database in .gitignore)
