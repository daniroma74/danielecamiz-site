-- SQL per aggiungere ritratti dei compositori da Wikimedia Commons
-- Esegui con: sqlite3 cms/db/main.sqlite < scripts/composer-portraits-manual.sql

-- Compositori classici famosi
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Glazunov.jpg/440px-Glazunov.jpg' WHERE full_name = 'Alexandr Kostantinovič Glazunov';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Bedrich_Smetana_2.jpg/440px-Bedrich_Smetana_2.jpg' WHERE full_name = 'Bedřich Smetana';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Benjamin_Britten%2C_London_Records_1968_publicity.jpg/440px-Benjamin_Britten%2C_London_Records_1968_publicity.jpg' WHERE full_name = 'Benjamin Britten';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Camille_Saint-Sa%C3%ABns.jpg/440px-Camille_Saint-Sa%C3%ABns.jpg' WHERE full_name = 'Camille Saint-Saëns';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Carl_Maria_von_Weber_in_His_Study_-_John_Cawse.png/440px-Carl_Maria_von_Weber_in_His_Study_-_John_Cawse.png' WHERE full_name = 'Carl Maria von Weber';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Carl_Nielsen_1908.jpg/440px-Carl_Nielsen_1908.jpg' WHERE full_name = 'Carl Nielsen';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Carlos_Gardel%2C_1933.jpg/440px-Carlos_Gardel%2C_1933.jpg' WHERE full_name = 'Carlos Gardel';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Eduardo_di_Capua.jpg/440px-Eduardo_di_Capua.jpg' WHERE full_name = 'Eduardo Di Capua';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Edward_Elgar.jpg/440px-Edward_Elgar.jpg' WHERE full_name = 'Edward Elgar';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Ennio_Morricone_2007.jpg/440px-Ennio_Morricone_2007.jpg' WHERE full_name = 'Ennio Morricone';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Fanny_Hensel_1842.jpg/440px-Fanny_Hensel_1842.jpg' WHERE full_name = 'Fanny Mendelssohn';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Gaetano_Donizetti.jpg/440px-Gaetano_Donizetti.jpg' WHERE full_name = 'Gaetano Donizetti';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/George_Gershwin_1937.jpg/440px-George_Gershwin_1937.jpg' WHERE full_name = 'George Gershwin';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Giovanni_Paisiello.jpg/440px-Giovanni_Paisiello.jpg' WHERE full_name = 'Giovanni Paisiello';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Jean_Sibelius_1913.jpg/440px-Jean_Sibelius_1913.jpg' WHERE full_name = 'Jean Sibelius';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Johann_Strauss_II.jpg/440px-Johann_Strauss_II.jpg' WHERE full_name = 'Johann Strauss Jr.';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Luigi_Cherubini.jpg/440px-Luigi_Cherubini.jpg' WHERE full_name = 'Luigi Cherubini';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Leo_Delibes.jpg/440px-Leo_Delibes.jpg' WHERE full_name = 'Léo Delibes';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Nikolay_Rimsky-Korsakov_1897.jpg/440px-Nikolay_Rimsky-Korsakov_1897.jpg' WHERE full_name = 'Nicolaj Rimskij-Korsakov';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Ottorino_Respighi_c1913.jpg/440px-Ottorino_Respighi_c1913.jpg' WHERE full_name = 'Ottorino Respighi';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Pietro_Mascagni_ca.1910.jpg/440px-Pietro_Mascagni_ca.1910.jpg' WHERE full_name = 'Pietro Mascagni';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Ruggero_Leoncavallo.jpg/440px-Ruggero_Leoncavallo.jpg' WHERE full_name = 'Ruggero Leoncavallo';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Samuel_Barber_1944.jpg/440px-Samuel_Barber_1944.jpg' WHERE full_name = 'Samuel Barber';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Sergei_Prokofiev_1918_over_Chair_Bain.jpg/440px-Sergei_Prokofiev_1918_over_Chair_Bain.jpg' WHERE full_name = 'Sergej Prokofiev';
UPDATE composers SET portrait_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Vincenzo_Bellini.jpg/440px-Vincenzo_Bellini.jpg' WHERE full_name = 'Vincenzo Bellini';

-- Compositori meno conosciuti o senza immagini su Wikimedia (usa placeholder generico)
-- Questi possono essere caricati manualmente su Cloudinary se hai le immagini
UPDATE composers SET portrait_url = '/img/composers/placeholder-composer.jpg' WHERE full_name IN (
  'An-sam Lee',
  'Dong-jin Kim',
  'Du-nam Cho',
  'Ernesto De Curtis',
  'Francesco Sartori',
  'Kyu-hwan Kim',
  'Marco Enrico Bossi',
  'Peter Warlock',
  'Salvatore Cardillo',
  'Stanislao Gastaldon',
  'Vasily Kalinnikov',
  'Yeon-jun Kim',
  'Young-seop Choi'
);
