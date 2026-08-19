require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.example') });

const mongoose = require('mongoose');
const Question = require('../models/Question');

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/gk-battle';

const questions = [
  // ═══════════════════════════════════════════════════════════════
  //  INDIAN HISTORY (20)
  // ═══════════════════════════════════════════════════════════════
  { question: 'Who was the first Emperor of the Maurya dynasty?', options: ['Ashoka', 'Chandragupta Maurya', 'Bindusara', 'Brihadratha'], correctAnswer: 1, difficulty: 'easy', category: 'Indian History' },
  { question: 'The Battle of Plassey was fought in which year?', options: ['1757', '1764', '1857', '1947'], correctAnswer: 0, difficulty: 'easy', category: 'Indian History' },
  { question: 'Who is known as the Iron Man of India?', options: ['Jawaharlal Nehru', 'Mahatma Gandhi', 'Sardar Vallabhbhai Patel', 'Subhas Chandra Bose'], correctAnswer: 2, difficulty: 'easy', category: 'Indian History' },
  { question: 'The Quit India Movement was launched in which year?', options: ['1930', '1940', '1942', '1946'], correctAnswer: 2, difficulty: 'easy', category: 'Indian History' },
  { question: 'Who built the Taj Mahal?', options: ['Akbar', 'Shah Jahan', 'Jahangir', 'Aurangzeb'], correctAnswer: 1, difficulty: 'easy', category: 'Indian History' },
  { question: 'Which Mughal emperor introduced the Mansabdari system?', options: ['Babur', 'Humayun', 'Akbar', 'Shah Jahan'], correctAnswer: 2, difficulty: 'moderate', category: 'Indian History' },
  { question: 'The Jallianwala Bagh massacre took place in which city?', options: ['Delhi', 'Amritsar', 'Lahore', 'Lucknow'], correctAnswer: 1, difficulty: 'easy', category: 'Indian History' },
  { question: 'Who founded the Indian National Congress?', options: ['Mahatma Gandhi', 'Allan Octavian Hume', 'Dadabhai Naoroji', 'Bal Gangadhar Tilak'], correctAnswer: 1, difficulty: 'moderate', category: 'Indian History' },
  { question: 'Ashoka the Great belonged to which dynasty?', options: ['Gupta', 'Maurya', 'Chola', 'Kushan'], correctAnswer: 1, difficulty: 'easy', category: 'Indian History' },
  { question: 'The first war of Indian independence (Sepoy Mutiny) occurred in which year?', options: ['1847', '1857', '1867', '1877'], correctAnswer: 1, difficulty: 'easy', category: 'Indian History' },
  { question: 'Who was the last Mughal Emperor of India?', options: ['Aurangzeb', 'Bahadur Shah Zafar', 'Shah Alam II', 'Akbar II'], correctAnswer: 1, difficulty: 'moderate', category: 'Indian History' },
  { question: 'Which Chola king built the Brihadeeswarar Temple at Thanjavur?', options: ['Rajendra Chola I', 'Rajaraja Chola I', 'Kulottunga I', 'Karikala'], correctAnswer: 1, difficulty: 'moderate', category: 'Indian History' },
  { question: 'The Salt March (Dandi March) was led by whom?', options: ['Jawaharlal Nehru', 'Subhas Chandra Bose', 'Mahatma Gandhi', 'Bhagat Singh'], correctAnswer: 2, difficulty: 'easy', category: 'Indian History' },
  { question: 'Which kingdom was ruled by Tipu Sultan?', options: ['Hyderabad', 'Mysore', 'Travancore', 'Maratha'], correctAnswer: 1, difficulty: 'moderate', category: 'Indian History' },
  { question: 'Who wrote the book "Discovery of India"?', options: ['Mahatma Gandhi', 'Jawaharlal Nehru', 'B. R. Ambedkar', 'Rabindranath Tagore'], correctAnswer: 1, difficulty: 'moderate', category: 'Indian History' },
  { question: 'The Battle of Panipat (1526) was fought between Babur and whom?', options: ['Rana Sanga', 'Ibrahim Lodi', 'Hemu', 'Sher Shah Suri'], correctAnswer: 1, difficulty: 'moderate', category: 'Indian History' },
  { question: 'Who was the founder of the Gupta dynasty?', options: ['Chandragupta I', 'Samudragupta', 'Sri Gupta', 'Kumaragupta'], correctAnswer: 2, difficulty: 'moderate', category: 'Indian History' },
  { question: 'In which year was the Partition of Bengal carried out by Lord Curzon?', options: ['1901', '1905', '1909', '1911'], correctAnswer: 1, difficulty: 'moderate', category: 'Indian History' },
  { question: 'Who gave the slogan "Tum mujhe khoon do, main tumhe azadi dunga"?', options: ['Bhagat Singh', 'Subhas Chandra Bose', 'Chandrashekhar Azad', 'Lala Lajpat Rai'], correctAnswer: 1, difficulty: 'easy', category: 'Indian History' },
  { question: 'The Khilafat Movement was started in which year?', options: ['1917', '1919', '1920', '1922'], correctAnswer: 2, difficulty: 'moderate', category: 'Indian History' },

  // ═══════════════════════════════════════════════════════════════
  //  WORLD HISTORY (20)
  // ═══════════════════════════════════════════════════════════════
  { question: 'Who was the first President of the United States?', options: ['Thomas Jefferson', 'Abraham Lincoln', 'George Washington', 'John Adams'], correctAnswer: 2, difficulty: 'easy', category: 'World History' },
  { question: 'The French Revolution began in which year?', options: ['1776', '1789', '1799', '1804'], correctAnswer: 1, difficulty: 'easy', category: 'World History' },
  { question: 'Who discovered America in 1492?', options: ['Vasco da Gama', 'Ferdinand Magellan', 'Christopher Columbus', 'Amerigo Vespucci'], correctAnswer: 2, difficulty: 'easy', category: 'World History' },
  { question: 'World War I started in which year?', options: ['1912', '1914', '1916', '1918'], correctAnswer: 1, difficulty: 'easy', category: 'World History' },
  { question: 'Who was the leader of Nazi Germany?', options: ['Benito Mussolini', 'Joseph Stalin', 'Adolf Hitler', 'Winston Churchill'], correctAnswer: 2, difficulty: 'easy', category: 'World History' },
  { question: 'The Berlin Wall fell in which year?', options: ['1987', '1989', '1991', '1993'], correctAnswer: 1, difficulty: 'easy', category: 'World History' },
  { question: 'Which empire was ruled by Julius Caesar?', options: ['Greek', 'Roman', 'Persian', 'Ottoman'], correctAnswer: 1, difficulty: 'easy', category: 'World History' },
  { question: 'Who wrote the Communist Manifesto?', options: ['Lenin', 'Marx and Engels', 'Stalin', 'Trotsky'], correctAnswer: 1, difficulty: 'moderate', category: 'World History' },
  { question: 'The Renaissance began in which country?', options: ['France', 'England', 'Italy', 'Germany'], correctAnswer: 2, difficulty: 'moderate', category: 'World History' },
  { question: 'Which treaty ended World War I?', options: ['Treaty of Paris', 'Treaty of Versailles', 'Treaty of Vienna', 'Treaty of Westphalia'], correctAnswer: 1, difficulty: 'moderate', category: 'World History' },
  { question: 'The atomic bombs were dropped on Hiroshima and Nagasaki in which year?', options: ['1943', '1944', '1945', '1946'], correctAnswer: 2, difficulty: 'easy', category: 'World History' },
  { question: 'Who was the first person to walk on the Moon?', options: ['Buzz Aldrin', 'Neil Armstrong', 'Yuri Gagarin', 'Michael Collins'], correctAnswer: 1, difficulty: 'easy', category: 'World History' },
  { question: 'The United Nations was established in which year?', options: ['1944', '1945', '1946', '1948'], correctAnswer: 1, difficulty: 'moderate', category: 'World History' },
  { question: 'Who was known as the Maid of Orléans?', options: ['Queen Victoria', 'Joan of Arc', 'Marie Antoinette', 'Catherine the Great'], correctAnswer: 1, difficulty: 'moderate', category: 'World History' },
  { question: 'The Russian Revolution took place in which year?', options: ['1905', '1914', '1917', '1921'], correctAnswer: 2, difficulty: 'moderate', category: 'World History' },
  { question: 'Which ancient civilization built the pyramids at Giza?', options: ['Greek', 'Roman', 'Egyptian', 'Mesopotamian'], correctAnswer: 2, difficulty: 'easy', category: 'World History' },
  { question: 'The Magna Carta was signed in which year?', options: ['1066', '1215', '1415', '1485'], correctAnswer: 1, difficulty: 'moderate', category: 'World History' },
  { question: 'Who led the Cuban Revolution?', options: ['Che Guevara', 'Fidel Castro', 'Raul Castro', 'José Martí'], correctAnswer: 1, difficulty: 'moderate', category: 'World History' },
  { question: 'The Cold War was primarily between which two superpowers?', options: ['USA and China', 'USA and USSR', 'UK and USSR', 'France and Germany'], correctAnswer: 1, difficulty: 'easy', category: 'World History' },
  { question: 'Who was the first Emperor of China?', options: ['Qin Shi Huang', 'Kublai Khan', 'Han Wudi', 'Sun Yat-sen'], correctAnswer: 0, difficulty: 'moderate', category: 'World History' },

  // ═══════════════════════════════════════════════════════════════
  //  GEOGRAPHY (20)
  // ═══════════════════════════════════════════════════════════════
  { question: 'Which is the largest continent by area?', options: ['Africa', 'North America', 'Asia', 'Europe'], correctAnswer: 2, difficulty: 'easy', category: 'Geography' },
  { question: 'Which is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], correctAnswer: 1, difficulty: 'easy', category: 'Geography' },
  { question: 'Mount Everest is located on the border of which two countries?', options: ['India and China', 'Nepal and China', 'Nepal and India', 'Pakistan and China'], correctAnswer: 1, difficulty: 'easy', category: 'Geography' },
  { question: 'Which is the largest ocean in the world?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], correctAnswer: 2, difficulty: 'easy', category: 'Geography' },
  { question: 'Which country has the largest population in the world?', options: ['India', 'USA', 'China', 'Indonesia'], correctAnswer: 0, difficulty: 'easy', category: 'Geography' },
  { question: 'The Sahara Desert is located in which continent?', options: ['Asia', 'Africa', 'Australia', 'South America'], correctAnswer: 1, difficulty: 'easy', category: 'Geography' },
  { question: 'Which is the smallest country in the world by area?', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'], correctAnswer: 1, difficulty: 'easy', category: 'Geography' },
  { question: 'Which is the deepest ocean trench?', options: ['Tonga Trench', 'Mariana Trench', 'Philippine Trench', 'Kuril Trench'], correctAnswer: 1, difficulty: 'moderate', category: 'Geography' },
  { question: 'The Amazon Rainforest is located mostly in which country?', options: ['Colombia', 'Peru', 'Brazil', 'Venezuela'], correctAnswer: 2, difficulty: 'easy', category: 'Geography' },
  { question: 'Which imaginary line divides the Earth into Northern and Southern hemispheres?', options: ['Tropic of Cancer', 'Equator', 'Prime Meridian', 'Tropic of Capricorn'], correctAnswer: 1, difficulty: 'easy', category: 'Geography' },
  { question: 'Which is the largest lake in the world by surface area?', options: ['Lake Superior', 'Lake Victoria', 'Caspian Sea', 'Lake Baikal'], correctAnswer: 2, difficulty: 'moderate', category: 'Geography' },
  { question: 'The Great Barrier Reef is located off the coast of which country?', options: ['Indonesia', 'Philippines', 'Australia', 'Japan'], correctAnswer: 2, difficulty: 'easy', category: 'Geography' },
  { question: 'Which river flows through the Grand Canyon?', options: ['Missouri River', 'Colorado River', 'Rio Grande', 'Columbia River'], correctAnswer: 1, difficulty: 'moderate', category: 'Geography' },
  { question: 'Which is the largest island in the world?', options: ['Borneo', 'Madagascar', 'Greenland', 'New Guinea'], correctAnswer: 2, difficulty: 'moderate', category: 'Geography' },
  { question: 'The Andes mountain range is located in which continent?', options: ['Asia', 'Africa', 'South America', 'Europe'], correctAnswer: 2, difficulty: 'easy', category: 'Geography' },
  { question: 'Which is the driest desert on Earth?', options: ['Sahara', 'Gobi', 'Atacama', 'Kalahari'], correctAnswer: 2, difficulty: 'moderate', category: 'Geography' },
  { question: 'Which strait separates Asia from North America?', options: ['Strait of Gibraltar', 'Bering Strait', 'Strait of Malacca', 'Strait of Hormuz'], correctAnswer: 1, difficulty: 'moderate', category: 'Geography' },
  { question: 'Which is the highest waterfall in the world?', options: ['Niagara Falls', 'Victoria Falls', 'Angel Falls', 'Iguazu Falls'], correctAnswer: 2, difficulty: 'moderate', category: 'Geography' },
  { question: 'How many time zones does Russia span?', options: ['7', '9', '11', '13'], correctAnswer: 2, difficulty: 'moderate', category: 'Geography' },
  { question: 'Which country is known as the Land of the Rising Sun?', options: ['China', 'South Korea', 'Japan', 'Thailand'], correctAnswer: 2, difficulty: 'easy', category: 'Geography' },

  // ═══════════════════════════════════════════════════════════════
  //  INDIAN POLITY (20)
  // ═══════════════════════════════════════════════════════════════
  { question: 'Who is known as the Father of the Indian Constitution?', options: ['Mahatma Gandhi', 'B. R. Ambedkar', 'Jawaharlal Nehru', 'Sardar Patel'], correctAnswer: 1, difficulty: 'easy', category: 'Indian Polity' },
  { question: 'How many fundamental rights are guaranteed by the Indian Constitution?', options: ['5', '6', '7', '8'], correctAnswer: 1, difficulty: 'easy', category: 'Indian Polity' },
  { question: 'Who was the first President of India?', options: ['Rajendra Prasad', 'S. Radhakrishnan', 'Zakir Husain', 'V. V. Giri'], correctAnswer: 0, difficulty: 'easy', category: 'Indian Polity' },
  { question: 'The Indian Constitution was adopted on which date?', options: ['15 August 1947', '26 January 1950', '26 November 1949', '2 October 1950'], correctAnswer: 2, difficulty: 'moderate', category: 'Indian Polity' },
  { question: 'Which Article of the Indian Constitution deals with the Right to Equality?', options: ['Article 12', 'Article 14', 'Article 19', 'Article 21'], correctAnswer: 1, difficulty: 'moderate', category: 'Indian Polity' },
  { question: 'How many members are there in the Rajya Sabha (maximum)?', options: ['200', '238', '245', '250'], correctAnswer: 3, difficulty: 'moderate', category: 'Indian Polity' },
  { question: 'The President of India is elected by which method?', options: ['Direct election', 'Indirect election', 'Appointment by PM', 'Nomination'], correctAnswer: 1, difficulty: 'easy', category: 'Indian Polity' },
  { question: 'What is the minimum age to become the President of India?', options: ['25 years', '30 years', '35 years', '40 years'], correctAnswer: 2, difficulty: 'moderate', category: 'Indian Polity' },
  { question: 'Which is the highest court in India?', options: ['High Court', 'Supreme Court', 'District Court', 'Sessions Court'], correctAnswer: 1, difficulty: 'easy', category: 'Indian Polity' },
  { question: 'The Preamble to the Indian Constitution begins with which word?', options: ['We', 'India', 'The', 'All'], correctAnswer: 0, difficulty: 'easy', category: 'Indian Polity' },
  { question: 'How many schedules are there in the Indian Constitution?', options: ['8', '10', '12', '14'], correctAnswer: 2, difficulty: 'moderate', category: 'Indian Polity' },
  { question: 'Who has the power to dissolve the Lok Sabha?', options: ['Prime Minister', 'Speaker', 'President', 'Chief Justice'], correctAnswer: 2, difficulty: 'moderate', category: 'Indian Polity' },
  { question: 'Which amendment is known as the Mini Constitution of India?', options: ['42nd', '44th', '73rd', '74th'], correctAnswer: 0, difficulty: 'moderate', category: 'Indian Polity' },
  { question: 'What is the maximum strength of the Lok Sabha?', options: ['500', '535', '545', '552'], correctAnswer: 3, difficulty: 'moderate', category: 'Indian Polity' },
  { question: 'The Right to Education was added by which constitutional amendment?', options: ['83rd', '86th', '91st', '93rd'], correctAnswer: 1, difficulty: 'moderate', category: 'Indian Polity' },
  { question: 'Who appoints the Chief Justice of India?', options: ['Parliament', 'Prime Minister', 'President', 'Law Minister'], correctAnswer: 2, difficulty: 'easy', category: 'Indian Polity' },
  { question: 'How many Union Territories are there in India (as of 2024)?', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'easy', category: 'Indian Polity' },
  { question: 'Which part of the Constitution deals with Directive Principles of State Policy?', options: ['Part III', 'Part IV', 'Part V', 'Part VI'], correctAnswer: 1, difficulty: 'moderate', category: 'Indian Polity' },
  { question: 'The concept of Fundamental Duties was taken from which country\'s constitution?', options: ['USA', 'UK', 'USSR', 'France'], correctAnswer: 2, difficulty: 'moderate', category: 'Indian Polity' },
  { question: 'Who was the Chairman of the Drafting Committee of the Indian Constitution?', options: ['Jawaharlal Nehru', 'Rajendra Prasad', 'B. R. Ambedkar', 'Sardar Patel'], correctAnswer: 2, difficulty: 'easy', category: 'Indian Polity' },

  // ═══════════════════════════════════════════════════════════════
  //  SCIENCE (20)
  // ═══════════════════════════════════════════════════════════════
  { question: 'What is the chemical symbol for water?', options: ['HO', 'H2O', 'H2O2', 'OH'], correctAnswer: 1, difficulty: 'easy', category: 'Science' },
  { question: 'What is the speed of light in vacuum (approximately)?', options: ['3 × 10⁶ m/s', '3 × 10⁷ m/s', '3 × 10⁸ m/s', '3 × 10⁹ m/s'], correctAnswer: 2, difficulty: 'easy', category: 'Science' },
  { question: 'Who proposed the theory of relativity?', options: ['Isaac Newton', 'Albert Einstein', 'Niels Bohr', 'Max Planck'], correctAnswer: 1, difficulty: 'easy', category: 'Science' },
  { question: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi Apparatus'], correctAnswer: 2, difficulty: 'easy', category: 'Science' },
  { question: 'Which gas do plants absorb during photosynthesis?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], correctAnswer: 2, difficulty: 'easy', category: 'Science' },
  { question: 'What is the chemical formula for table salt?', options: ['NaOH', 'NaCl', 'KCl', 'CaCl2'], correctAnswer: 1, difficulty: 'easy', category: 'Science' },
  { question: 'Which blood type is known as the universal donor?', options: ['A+', 'B+', 'AB+', 'O-'], correctAnswer: 3, difficulty: 'moderate', category: 'Science' },
  { question: 'How many bones are in the adult human body?', options: ['186', '196', '206', '216'], correctAnswer: 2, difficulty: 'easy', category: 'Science' },
  { question: 'What is the hardest natural substance on Earth?', options: ['Gold', 'Iron', 'Diamond', 'Platinum'], correctAnswer: 2, difficulty: 'easy', category: 'Science' },
  { question: 'Which planet has the most moons in our solar system?', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], correctAnswer: 1, difficulty: 'moderate', category: 'Science' },
  { question: 'What is the pH value of pure water?', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'easy', category: 'Science' },
  { question: 'Who discovered penicillin?', options: ['Louis Pasteur', 'Alexander Fleming', 'Joseph Lister', 'Robert Koch'], correctAnswer: 1, difficulty: 'moderate', category: 'Science' },
  { question: 'What is the most abundant gas in Earth\'s atmosphere?', options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Argon'], correctAnswer: 2, difficulty: 'easy', category: 'Science' },
  { question: 'Which organ in the human body produces insulin?', options: ['Liver', 'Kidney', 'Pancreas', 'Heart'], correctAnswer: 2, difficulty: 'moderate', category: 'Science' },
  { question: 'What is the unit of electric current?', options: ['Volt', 'Watt', 'Ohm', 'Ampere'], correctAnswer: 3, difficulty: 'easy', category: 'Science' },
  { question: 'DNA stands for?', options: ['Deoxyribose Nucleic Acid', 'Deoxyribonucleic Acid', 'Dinitro Nucleic Acid', 'Deoxyribose Nitrogen Acid'], correctAnswer: 1, difficulty: 'moderate', category: 'Science' },
  { question: 'Which element has the atomic number 1?', options: ['Helium', 'Hydrogen', 'Lithium', 'Carbon'], correctAnswer: 1, difficulty: 'easy', category: 'Science' },
  { question: 'What is the boiling point of water at sea level?', options: ['90°C', '95°C', '100°C', '105°C'], correctAnswer: 2, difficulty: 'easy', category: 'Science' },
  { question: 'Who is known as the Father of Modern Physics?', options: ['Isaac Newton', 'Albert Einstein', 'Galileo Galilei', 'Niels Bohr'], correctAnswer: 1, difficulty: 'moderate', category: 'Science' },
  { question: 'What type of energy does the Sun primarily emit?', options: ['Kinetic Energy', 'Chemical Energy', 'Nuclear Energy', 'Electromagnetic Energy'], correctAnswer: 3, difficulty: 'moderate', category: 'Science' },

  // ═══════════════════════════════════════════════════════════════
  //  SPACE (20)
  // ═══════════════════════════════════════════════════════════════
  { question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correctAnswer: 1, difficulty: 'easy', category: 'Space' },
  { question: 'Which is the largest planet in our solar system?', options: ['Saturn', 'Neptune', 'Jupiter', 'Uranus'], correctAnswer: 2, difficulty: 'easy', category: 'Space' },
  { question: 'What is the closest star to Earth?', options: ['Proxima Centauri', 'Sirius', 'Alpha Centauri', 'Sun'], correctAnswer: 3, difficulty: 'easy', category: 'Space' },
  { question: 'How many planets are in our solar system?', options: ['7', '8', '9', '10'], correctAnswer: 1, difficulty: 'easy', category: 'Space' },
  { question: 'Which planet is known as the Morning Star or Evening Star?', options: ['Mars', 'Mercury', 'Venus', 'Jupiter'], correctAnswer: 2, difficulty: 'easy', category: 'Space' },
  { question: 'What is the name of the galaxy we live in?', options: ['Andromeda', 'Milky Way', 'Sombrero', 'Whirlpool'], correctAnswer: 1, difficulty: 'easy', category: 'Space' },
  { question: 'Who was the first human in space?', options: ['Neil Armstrong', 'Buzz Aldrin', 'Yuri Gagarin', 'John Glenn'], correctAnswer: 2, difficulty: 'easy', category: 'Space' },
  { question: 'What is the smallest planet in our solar system?', options: ['Mars', 'Mercury', 'Venus', 'Pluto'], correctAnswer: 1, difficulty: 'easy', category: 'Space' },
  { question: 'Which planet has the Great Red Spot?', options: ['Mars', 'Saturn', 'Jupiter', 'Neptune'], correctAnswer: 2, difficulty: 'easy', category: 'Space' },
  { question: 'What is a light-year a measure of?', options: ['Time', 'Distance', 'Speed', 'Brightness'], correctAnswer: 1, difficulty: 'easy', category: 'Space' },
  { question: 'Which space agency launched the Hubble Space Telescope?', options: ['ESA', 'ISRO', 'NASA', 'Roscosmos'], correctAnswer: 2, difficulty: 'moderate', category: 'Space' },
  { question: 'What is the name of the first artificial satellite launched into space?', options: ['Explorer 1', 'Sputnik 1', 'Vostok 1', 'Apollo 11'], correctAnswer: 1, difficulty: 'moderate', category: 'Space' },
  { question: 'Which planet is tilted on its side, rotating nearly perpendicular to its orbit?', options: ['Neptune', 'Saturn', 'Uranus', 'Jupiter'], correctAnswer: 2, difficulty: 'moderate', category: 'Space' },
  { question: 'What is the outermost layer of the Sun called?', options: ['Photosphere', 'Chromosphere', 'Corona', 'Convective Zone'], correctAnswer: 2, difficulty: 'moderate', category: 'Space' },
  { question: 'The International Space Station (ISS) orbits Earth approximately every how many minutes?', options: ['45', '60', '90', '120'], correctAnswer: 2, difficulty: 'moderate', category: 'Space' },
  { question: 'Which Indian satellite was launched first?', options: ['Bhaskara', 'Aryabhata', 'INSAT-1A', 'Rohini'], correctAnswer: 1, difficulty: 'moderate', category: 'Space' },
  { question: 'What is the name of the Mars rover that landed in 2021?', options: ['Curiosity', 'Opportunity', 'Spirit', 'Perseverance'], correctAnswer: 3, difficulty: 'moderate', category: 'Space' },
  { question: 'Which planet has the shortest day (rotation period)?', options: ['Mercury', 'Earth', 'Jupiter', 'Mars'], correctAnswer: 2, difficulty: 'moderate', category: 'Space' },
  { question: 'What type of celestial object is the Sun?', options: ['Red Giant', 'White Dwarf', 'Yellow Dwarf', 'Blue Giant'], correctAnswer: 2, difficulty: 'moderate', category: 'Space' },
  { question: 'How long does sunlight take to reach Earth?', options: ['4 minutes', '6 minutes', '8 minutes', '12 minutes'], correctAnswer: 2, difficulty: 'moderate', category: 'Space' },

  // ═══════════════════════════════════════════════════════════════
  //  SPORTS (20)
  // ═══════════════════════════════════════════════════════════════
  { question: 'In which sport is the term "love" used for zero?', options: ['Badminton', 'Tennis', 'Table Tennis', 'Squash'], correctAnswer: 1, difficulty: 'easy', category: 'Sports' },
  { question: 'How many players are there in a cricket team?', options: ['9', '10', '11', '12'], correctAnswer: 2, difficulty: 'easy', category: 'Sports' },
  { question: 'Which country won the FIFA World Cup 2022?', options: ['France', 'Brazil', 'Argentina', 'Germany'], correctAnswer: 2, difficulty: 'easy', category: 'Sports' },
  { question: 'What is the national sport of India?', options: ['Cricket', 'Hockey', 'Kabaddi', 'No official national sport'], correctAnswer: 3, difficulty: 'moderate', category: 'Sports' },
  { question: 'The Olympic Games are held every how many years?', options: ['2', '3', '4', '5'], correctAnswer: 2, difficulty: 'easy', category: 'Sports' },
  { question: 'Who has won the most Grand Slam titles in men\'s tennis (as of 2024)?', options: ['Roger Federer', 'Rafael Nadal', 'Novak Djokovic', 'Pete Sampras'], correctAnswer: 2, difficulty: 'moderate', category: 'Sports' },
  { question: 'In which sport is the Stanley Cup awarded?', options: ['Basketball', 'Baseball', 'American Football', 'Ice Hockey'], correctAnswer: 3, difficulty: 'moderate', category: 'Sports' },
  { question: 'Who holds the record for most runs in international cricket?', options: ['Ricky Ponting', 'Sachin Tendulkar', 'Virat Kohli', 'Jacques Kallis'], correctAnswer: 1, difficulty: 'easy', category: 'Sports' },
  { question: 'How many players are on a basketball team on the court at one time?', options: ['4', '5', '6', '7'], correctAnswer: 1, difficulty: 'easy', category: 'Sports' },
  { question: 'Which country has hosted the most Olympic Games?', options: ['France', 'UK', 'USA', 'Japan'], correctAnswer: 2, difficulty: 'moderate', category: 'Sports' },
  { question: 'The Wimbledon tennis tournament is played on what surface?', options: ['Clay', 'Hard Court', 'Grass', 'Carpet'], correctAnswer: 2, difficulty: 'easy', category: 'Sports' },
  { question: 'Who is known as the "Flying Sikh" of India?', options: ['Milkha Singh', 'P.T. Usha', 'Neeraj Chopra', 'Abhinav Bindra'], correctAnswer: 0, difficulty: 'easy', category: 'Sports' },
  { question: 'In football (soccer), how long is a standard match?', options: ['60 minutes', '80 minutes', '90 minutes', '120 minutes'], correctAnswer: 2, difficulty: 'easy', category: 'Sports' },
  { question: 'Which country has won the most Cricket World Cups?', options: ['India', 'West Indies', 'Australia', 'England'], correctAnswer: 2, difficulty: 'moderate', category: 'Sports' },
  { question: 'What is the maximum score in a single frame of bowling?', options: ['200', '250', '280', '300'], correctAnswer: 3, difficulty: 'moderate', category: 'Sports' },
  { question: 'In which year did India first win the Cricket World Cup?', options: ['1979', '1983', '1987', '1992'], correctAnswer: 1, difficulty: 'easy', category: 'Sports' },
  { question: 'Who won the first gold medal for India at the Olympics?', options: ['Abhinav Bindra', 'Rajyavardhan Singh Rathore', 'Indian Hockey Team 1928', 'Norman Pritchard'], correctAnswer: 2, difficulty: 'moderate', category: 'Sports' },
  { question: 'How many rings are on the Olympic flag?', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'easy', category: 'Sports' },
  { question: 'What sport is Usain Bolt famous for?', options: ['Swimming', 'Sprinting', 'Long Jump', 'Boxing'], correctAnswer: 1, difficulty: 'easy', category: 'Sports' },
  { question: 'Which is the only Grand Slam played on red clay?', options: ['Australian Open', 'French Open', 'Wimbledon', 'US Open'], correctAnswer: 1, difficulty: 'moderate', category: 'Sports' },

  // ═══════════════════════════════════════════════════════════════
  //  COMPUTERS (20)
  // ═══════════════════════════════════════════════════════════════
  { question: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Control Processing Unit'], correctAnswer: 0, difficulty: 'easy', category: 'Computers' },
  { question: 'Who is known as the father of computers?', options: ['Alan Turing', 'Charles Babbage', 'Bill Gates', 'Steve Jobs'], correctAnswer: 1, difficulty: 'easy', category: 'Computers' },
  { question: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Home Tool Markup Language'], correctAnswer: 0, difficulty: 'easy', category: 'Computers' },
  { question: 'Which programming language is known as the "language of the web"?', options: ['Python', 'Java', 'JavaScript', 'C++'], correctAnswer: 2, difficulty: 'easy', category: 'Computers' },
  { question: 'What does RAM stand for?', options: ['Read Access Memory', 'Random Access Memory', 'Rapid Access Memory', 'Run Access Memory'], correctAnswer: 1, difficulty: 'easy', category: 'Computers' },
  { question: 'Who founded Microsoft?', options: ['Steve Jobs', 'Mark Zuckerberg', 'Bill Gates and Paul Allen', 'Larry Page'], correctAnswer: 2, difficulty: 'easy', category: 'Computers' },
  { question: 'What is the binary system based on?', options: ['0 and 1', '1 and 2', '0 and 9', 'A and B'], correctAnswer: 0, difficulty: 'easy', category: 'Computers' },
  { question: 'Which company developed the Android operating system?', options: ['Apple', 'Microsoft', 'Google', 'Samsung'], correctAnswer: 2, difficulty: 'easy', category: 'Computers' },
  { question: 'What does URL stand for?', options: ['Universal Resource Locator', 'Uniform Resource Locator', 'Universal Reference Locator', 'Uniform Reference Link'], correctAnswer: 1, difficulty: 'moderate', category: 'Computers' },
  { question: 'Which is the world\'s first general-purpose electronic computer?', options: ['UNIVAC', 'ENIAC', 'MARK I', 'ABC'], correctAnswer: 1, difficulty: 'moderate', category: 'Computers' },
  { question: 'What does HTTP stand for?', options: ['HyperText Transfer Protocol', 'High Tech Transfer Protocol', 'Hyper Transfer Text Protocol', 'Home Transfer Text Protocol'], correctAnswer: 0, difficulty: 'easy', category: 'Computers' },
  { question: 'Which key combination is used to copy text?', options: ['Ctrl + V', 'Ctrl + C', 'Ctrl + X', 'Ctrl + Z'], correctAnswer: 1, difficulty: 'easy', category: 'Computers' },
  { question: 'What is the full form of Wi-Fi?', options: ['Wireless Fidelity', 'Wireless Functionality', 'Wide Fidelity', 'It has no full form'], correctAnswer: 3, difficulty: 'moderate', category: 'Computers' },
  { question: 'Which company created the iPhone?', options: ['Samsung', 'Google', 'Apple', 'Microsoft'], correctAnswer: 2, difficulty: 'easy', category: 'Computers' },
  { question: 'What does SSD stand for?', options: ['Solid State Drive', 'Solid Speed Disk', 'System Storage Device', 'Super Speed Drive'], correctAnswer: 0, difficulty: 'moderate', category: 'Computers' },
  { question: 'What is the maximum value of a byte?', options: ['128', '255', '256', '512'], correctAnswer: 1, difficulty: 'moderate', category: 'Computers' },
  { question: 'Which programming language was created by Guido van Rossum?', options: ['Ruby', 'Java', 'Python', 'PHP'], correctAnswer: 2, difficulty: 'moderate', category: 'Computers' },
  { question: 'What does GPU stand for?', options: ['General Processing Unit', 'Graphics Processing Unit', 'Global Processing Unit', 'Graphical Program Unit'], correctAnswer: 1, difficulty: 'easy', category: 'Computers' },
  { question: 'Linux is an example of what type of software?', options: ['Proprietary', 'Freeware', 'Open Source', 'Shareware'], correctAnswer: 2, difficulty: 'moderate', category: 'Computers' },
  { question: 'What does IP stand for in IP Address?', options: ['Internet Protocol', 'Internal Program', 'Internet Program', 'Intranet Protocol'], correctAnswer: 0, difficulty: 'easy', category: 'Computers' },

  // ═══════════════════════════════════════════════════════════════
  //  CURRENT AFFAIRS (20)
  // ═══════════════════════════════════════════════════════════════
  { question: 'Which organization is responsible for maintaining international peace and security?', options: ['NATO', 'WHO', 'United Nations', 'WTO'], correctAnswer: 2, difficulty: 'easy', category: 'Current Affairs' },
  { question: 'WHO stands for?', options: ['World Human Organization', 'World Health Organization', 'World Help Organization', 'World Heritage Organization'], correctAnswer: 1, difficulty: 'easy', category: 'Current Affairs' },
  { question: 'Which country is the headquarters of the United Nations?', options: ['Switzerland', 'France', 'United States', 'United Kingdom'], correctAnswer: 2, difficulty: 'easy', category: 'Current Affairs' },
  { question: 'What does GDP stand for?', options: ['Gross Development Product', 'Gross Domestic Product', 'General Domestic Product', 'Gross Direct Product'], correctAnswer: 1, difficulty: 'easy', category: 'Current Affairs' },
  { question: 'Which country hosted the G20 Summit in 2023?', options: ['Brazil', 'Japan', 'India', 'Italy'], correctAnswer: 2, difficulty: 'easy', category: 'Current Affairs' },
  { question: 'What is the currency of Japan?', options: ['Yuan', 'Won', 'Yen', 'Ringgit'], correctAnswer: 2, difficulty: 'easy', category: 'Current Affairs' },
  { question: 'Which space mission by ISRO successfully landed on the Moon\'s south pole?', options: ['Chandrayaan-1', 'Chandrayaan-2', 'Chandrayaan-3', 'Mangalyaan'], correctAnswer: 2, difficulty: 'easy', category: 'Current Affairs' },
  { question: 'The Nobel Peace Prize is awarded in which city?', options: ['Stockholm', 'Oslo', 'Geneva', 'Copenhagen'], correctAnswer: 1, difficulty: 'moderate', category: 'Current Affairs' },
  { question: 'What is the full form of BRICS?', options: ['Brazil, Russia, India, China, South Korea', 'Brazil, Russia, India, China, South Africa', 'Britain, Russia, India, China, Spain', 'Brazil, Rwanda, India, China, Sweden'], correctAnswer: 1, difficulty: 'moderate', category: 'Current Affairs' },
  { question: 'Which is the largest economy in the world by GDP?', options: ['China', 'Japan', 'United States', 'Germany'], correctAnswer: 2, difficulty: 'easy', category: 'Current Affairs' },
  { question: 'UNESCO is associated with which field?', options: ['Trade', 'Health', 'Education and Culture', 'Military'], correctAnswer: 2, difficulty: 'easy', category: 'Current Affairs' },
  { question: 'Which country has the largest area in the world?', options: ['China', 'United States', 'Canada', 'Russia'], correctAnswer: 3, difficulty: 'easy', category: 'Current Affairs' },
  { question: 'The International Court of Justice is located in which city?', options: ['New York', 'Geneva', 'The Hague', 'London'], correctAnswer: 2, difficulty: 'moderate', category: 'Current Affairs' },
  { question: 'What is the currency of the European Union?', options: ['Dollar', 'Pound', 'Euro', 'Franc'], correctAnswer: 2, difficulty: 'easy', category: 'Current Affairs' },
  { question: 'Which organization deals with international trade regulations?', options: ['IMF', 'World Bank', 'WTO', 'UNICEF'], correctAnswer: 2, difficulty: 'moderate', category: 'Current Affairs' },
  { question: 'What does NASA stand for?', options: ['National Aeronautics and Space Administration', 'North American Space Agency', 'National Aerospace and Science Academy', 'National Aeronautics and Science Administration'], correctAnswer: 0, difficulty: 'easy', category: 'Current Affairs' },
  { question: 'Which country is the world\'s largest producer of coffee?', options: ['Colombia', 'Vietnam', 'Brazil', 'Ethiopia'], correctAnswer: 2, difficulty: 'moderate', category: 'Current Affairs' },
  { question: 'The headquarters of WHO is located in which city?', options: ['New York', 'Paris', 'Geneva', 'London'], correctAnswer: 2, difficulty: 'moderate', category: 'Current Affairs' },
  { question: 'Which Indian city is known as the Silicon Valley of India?', options: ['Hyderabad', 'Pune', 'Bengaluru', 'Chennai'], correctAnswer: 2, difficulty: 'easy', category: 'Current Affairs' },
  { question: 'What does ISRO stand for?', options: ['Indian Space Research Organisation', 'International Space Research Organisation', 'Indian Science Research Organisation', 'Indian Satellite Research Organisation'], correctAnswer: 0, difficulty: 'easy', category: 'Current Affairs' },

  // ═══════════════════════════════════════════════════════════════
  //  GENERAL KNOWLEDGE (20)
  // ═══════════════════════════════════════════════════════════════
  { question: 'Which is the largest mammal in the world?', options: ['Elephant', 'Blue Whale', 'Giraffe', 'Hippopotamus'], correctAnswer: 1, difficulty: 'easy', category: 'General Knowledge' },
  { question: 'How many continents are there on Earth?', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'easy', category: 'General Knowledge' },
  { question: 'Which is the largest bone in the human body?', options: ['Humerus', 'Tibia', 'Femur', 'Spine'], correctAnswer: 2, difficulty: 'easy', category: 'General Knowledge' },
  { question: 'How many colors are there in a rainbow?', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'easy', category: 'General Knowledge' },
  { question: 'Which organ is primarily responsible for filtering blood in the human body?', options: ['Heart', 'Liver', 'Kidneys', 'Lungs'], correctAnswer: 2, difficulty: 'moderate', category: 'General Knowledge' },
  { question: 'What is the national flower of India?', options: ['Rose', 'Sunflower', 'Lotus', 'Jasmine'], correctAnswer: 2, difficulty: 'easy', category: 'General Knowledge' },
  { question: 'Which is the fastest land animal?', options: ['Lion', 'Cheetah', 'Horse', 'Leopard'], correctAnswer: 1, difficulty: 'easy', category: 'General Knowledge' },
  { question: 'How many teeth does a normal adult human have?', options: ['28', '30', '32', '34'], correctAnswer: 2, difficulty: 'easy', category: 'General Knowledge' },
  { question: 'What is the national animal of India?', options: ['Lion', 'Elephant', 'Bengal Tiger', 'Peacock'], correctAnswer: 2, difficulty: 'easy', category: 'General Knowledge' },
  { question: 'Which vitamin is primarily obtained from sunlight?', options: ['Vitamin A', 'Vitamin B', 'Vitamin C', 'Vitamin D'], correctAnswer: 3, difficulty: 'easy', category: 'General Knowledge' },
  { question: 'What is the currency of the United Kingdom?', options: ['Euro', 'Dollar', 'Pound Sterling', 'Franc'], correctAnswer: 2, difficulty: 'easy', category: 'General Knowledge' },
  { question: 'Which planet is known as Earth\'s twin?', options: ['Mars', 'Venus', 'Mercury', 'Neptune'], correctAnswer: 1, difficulty: 'easy', category: 'General Knowledge' },
  { question: 'What is the largest organ of the human body?', options: ['Liver', 'Brain', 'Skin', 'Heart'], correctAnswer: 2, difficulty: 'easy', category: 'General Knowledge' },
  { question: 'How many strings does a standard guitar have?', options: ['4', '5', '6', '7'], correctAnswer: 2, difficulty: 'easy', category: 'General Knowledge' },
  { question: 'Which metal is the best conductor of electricity?', options: ['Gold', 'Copper', 'Silver', 'Aluminum'], correctAnswer: 2, difficulty: 'moderate', category: 'General Knowledge' },
  { question: 'What is the national bird of India?', options: ['Eagle', 'Parrot', 'Peacock', 'Sparrow'], correctAnswer: 2, difficulty: 'easy', category: 'General Knowledge' },
  { question: 'Which language has the most native speakers in the world?', options: ['English', 'Mandarin Chinese', 'Spanish', 'Hindi'], correctAnswer: 1, difficulty: 'moderate', category: 'General Knowledge' },
  { question: 'What gas makes up the majority of the Earth\'s atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], correctAnswer: 1, difficulty: 'easy', category: 'General Knowledge' },
  { question: 'Which is the tallest building in the world (as of 2024)?', options: ['Shanghai Tower', 'Burj Khalifa', 'Makkah Royal Clock Tower', 'One World Trade Center'], correctAnswer: 1, difficulty: 'easy', category: 'General Knowledge' },
  { question: 'How many days are in a leap year?', options: ['364', '365', '366', '367'], correctAnswer: 2, difficulty: 'easy', category: 'General Knowledge' },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing questions
    const existing = await Question.countDocuments();
    if (existing > 0) {
      console.log(`Found ${existing} existing questions. Clearing...`);
      await Question.deleteMany({});
    }

    // Insert all questions
    const result = await Question.insertMany(questions);
    console.log(`✅ Seeded ${result.length} questions successfully!`);

    // Print stats
    const easyCount = questions.filter(q => q.difficulty === 'easy').length;
    const modCount = questions.filter(q => q.difficulty === 'moderate').length;
    console.log(`   Easy: ${easyCount}`);
    console.log(`   Moderate: ${modCount}`);

    const categories = [...new Set(questions.map(q => q.category))];
    console.log(`   Categories: ${categories.length}`);
    for (const cat of categories) {
      const count = questions.filter(q => q.category === cat).length;
      console.log(`     - ${cat}: ${count}`);
    }

    await mongoose.connection.close();
    console.log('✅ Done');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
