const SWATCH_PALETTE = [
    // Reds
    '#ef5350', '#f44336', '#e53935', '#d32f2f', '#c62828', '#b71c1c',
    '#ff5252', '#ff1744', '#d50000', '#e74c3c',
    // Pink
    '#f48fb1', '#f06292', '#ec407a', '#e91e63', '#d81b60', '#c2185b', '#ad1457', '#880e4f',
    '#ff4081', '#f50057', '#c51162',
    // Purple
    '#ce93d8', '#ba68c8', '#ab47bc', '#9c27b0', '#8e24aa', '#7b1fa2', '#6a1b9a', '#4a148c',
    '#e040fb', '#aa00ff', '#8e44ad',
    // Deep Purple
    '#b39ddb', '#9575cd', '#7e57c2', '#673ab7', '#5e35b1', '#512da8', '#4527a0', '#311b92',
    '#7c4dff', '#651fff', '#6200ea',
    // Indigo
    '#9fa8da', '#7986cb', '#5c6bc0', '#3f51b5', '#3949ab', '#303f9f', '#283593', '#1a237e',
    '#536dfe', '#3d5afe', '#304ffe',
    // Blue
    '#64b5f6', '#42a5f5', '#2196f3', '#1e88e5', '#1976d2', '#1565c0', '#0d47a1',
    '#448aff', '#2979ff', '#2962ff', '#2980b9', '#1a5276',
    // Light Blue
    '#4fc3f7', '#29b6f6', '#03a9f4', '#039be5', '#0277bd', '#40c4ff', '#0091ea',
    // Cyan
    '#4dd0e1', '#26c6da', '#00bcd4', '#00acc1', '#0097a7', '#00838f', '#006064',
    '#00e5ff', '#00b8d4', '#20c8e9', '#00b7db',
    // Teal
    '#4db6ac', '#26a69a', '#009688', '#00897b', '#00796b', '#00695c', '#004d40',
    '#1de9b6', '#00bfa5', '#17a589', '#117a65',
    // Green
    '#81c784', '#66bb6a', '#4caf50', '#43a047', '#388e3c', '#2e7d32', '#1b5e20',
    '#69f0ae', '#00c853', '#238500',
    // Light Green
    '#9ccc65', '#8bc34a', '#7cb342', '#689f38', '#558b2f', '#33691e', '#76ff03', '#64dd17',
    // Lime
    '#d4e157', '#cddc39', '#c0ca33', '#afb42b', '#9e9d24', '#827717', '#aeea00',
    // Yellow
    '#ffeb3b', '#fdd835', '#fbc02d', '#f9a825', '#f57f17', '#ffd600',
    // Amber
    '#ffca28', '#ffc107', '#ffb300', '#ffa000', '#ff8f00', '#ff6f00', '#ffab00', '#d6ba00',
    // Orange
    '#ffa726', '#ff9800', '#fb8c00', '#f57c00', '#ef6c00', '#e65100',
    '#ffab40', '#ff9100', '#ff6d00',
    // Deep Orange
    '#ff8a65', '#ff7043', '#ff5722', '#f4511e', '#e64a19', '#d84315', '#bf360c',
    '#ff3d00', '#dd2c00', '#ff4b0f',
    // Brown
    '#a1887f', '#8d6e63', '#795548', '#6d4c41', '#5d4037', '#4e342e', '#3e2723',
    // Blue Grey / Slate
    '#78909c', '#607d8b', '#546e7a', '#455a64', '#37474f', '#263238',
    '#728088', '#364149', '#2e86c1',
    // Custom
    '#a800a3', '#1c00a8', '#aa1ff4', '#9093e9', '#00d1c3',
    // Greys (light → dark)
    '#f5f5f5', '#eeeeee', '#e0e0e0', '#c8c8c8',
    '#bdbdbd', '#a0a0a0', '#909090', '#808080',
    '#757575', '#686868', '#555555', '#4a4a4a',
    '#424242', '#383838', '#303030', '#1e1e1e',
    '#181818', '#121212', '#0a0a0a',
    // Black and white
    '#000000', '#ffffff',
];

const SWATCH_PALETTE_VIBRANT = [
    // Neon Red
    '#ff0000', '#ff1a1a', '#ff073a', '#ff004d', '#e60026',
    '#ff2d2d', '#ff2052', '#cc0000', '#d50000', '#ff5050',
    // Hot Pink & Rose
    '#ff0080', '#ff0066', '#ff0055', '#ff1493', '#ff007f',
    '#fe019a', '#ff00aa', '#e91e8c', '#d81b60', '#ff69b4',
    '#ff3c78', '#ff2d78',
    // Electric Magenta
    '#ff00ff', '#ee00ff', '#ff00ee', '#ff00dd', '#f20089',
    '#d400ff', '#c724b1', '#ff3cf2',
    // Purple & Violet
    '#bf00ff', '#aa00ff', '#9900ff', '#8800ff', '#dd00ff',
    '#cc00ff', '#9b00e8', '#b100e8', '#7209b7', '#a800a3',
    '#ba00e0', '#9d00cc',
    // Ultra Violet / Deep Indigo
    '#7700ff', '#6600ff', '#5500ff', '#4400ff', '#3300ff',
    '#560bad', '#480ca8', '#3a0ca3', '#6a0dad',
    // Electric Blue
    '#0000ff', '#0022ff', '#0044ff', '#0066ff', '#2962ff',
    '#1500ff', '#0040ff', '#006aff', '#1a00ff',
    // Sky Electric
    '#0088ff', '#0099ff', '#00aaff', '#00bbff', '#0091ea',
    '#00b0ff', '#01cdfe', '#4d79ff',
    // Neon Cyan
    '#00ccff', '#00ddff', '#00eeff', '#00ffff', '#12f7ff',
    '#00e5ff', '#18ffff', '#07e4ff',
    // Electric Teal & Mint
    '#00ffee', '#00ffdd', '#00ffcc', '#00ffbb', '#00ffaa',
    '#05ffa1', '#1de9b6', '#0ff0fc',
    // Neon Green
    '#00ff00', '#11ff00', '#22ff00', '#39ff14', '#00ff44',
    '#00ff55', '#01ff70', '#00e676', '#76ff03', '#00ff88',
    // Lime & Yellow-Green
    '#66ff00', '#77ff00', '#88ff00', '#99ff00', '#aaff00',
    '#bbff00', '#c6ff00', '#7fff00',
    // Acid Yellow
    '#ccff00', '#ddff00', '#eeff00', '#ffff00', '#ffee00',
    '#fcee0a', '#ffd600',
    // Electric Amber & Gold
    '#ffdd00', '#ffcc00', '#ffbb00', '#ffaa00', '#ffd700',
    '#ffbf00', '#ffc200',
    // Neon Orange
    '#ff9900', '#ff8800', '#ff7700', '#ff6600', '#ff5500',
    '#ff6d00', '#ff6b00', '#ff4500',
    // Vaporwave / Signature
    '#ff71ce', '#b967ff', '#fffb96', '#ff1177', '#00ffe5',
    '#ff77aa', '#ff2d55', '#ff9f0a',
    // Deep Jewels
    '#990000', '#660033', '#330000', '#550099', '#000099',
    '#003399', '#006600', '#005500', '#cc6600', '#006666',
    '#003333', '#440044',
    // Dark Saturated
    '#cc0044', '#aa0066', '#880088', '#440099', '#0044a0', '#004488',
    // Greys (13, light → dark)
    '#f5f5f5', '#eeeeee', '#c8c8c8', '#bdbdbd', '#a0a0a0',
    '#909090', '#808080', '#555555', '#4a4a4a', '#424242',
    '#303030', '#1e1e1e', '#0a0a0a',
    // Black & White
    '#000000', '#ffffff',
];

const SWATCH_PALETTE_PASTEL = [
    // Blush & Baby Pink
    '#ffd7d7', '#ffb3b3', '#ffc0cb', '#ffb6c1', '#f4acb7',
    '#e8a0bf', '#f8c8d0', '#fadadd', '#ffb3c6', '#f9c8d0',
    // Rose & Dusty Pink
    '#e8b4b8', '#dba0a8', '#d49098', '#c88090', '#d8a0b0',
    '#e0b0c0', '#c8a0b0', '#c07080',
    // Peach & Apricot
    '#ffd5b8', '#ffbe9f', '#ffaa80', '#ffc9a8', '#f5c5a3',
    '#fdb99b', '#ffcba4', '#f0b8a0', '#e8b090', '#fac0a0',
    // Butter & Lemon
    '#fffbd4', '#fff5b7', '#fef9c3', '#fef08a', '#fffde7',
    '#fff9c4', '#ffecb3', '#fef3e2', '#fff8dc', '#fdfacd',
    // Mint & Seafoam
    '#c8f7c5', '#a8e6cf', '#b5ead7', '#c7f2a4', '#b2f7b2',
    '#9ee89e', '#abebc6', '#d4edda', '#b8f0d8', '#c0f0e0',
    // Sage & Pistachio
    '#c8dfc0', '#b8d0b0', '#a8c0a0', '#c0d8b8', '#d0e8c8',
    '#b8cdb0', '#c4d8bc', '#b0c8a8',
    // Baby Blue & Powder
    '#b3d9ff', '#87ceeb', '#87cefa', '#add8e6', '#b0c4de',
    '#cce5ff', '#d4ecf7', '#dbeeff', '#c5dff8', '#b8d8f8',
    // Periwinkle
    '#ccccff', '#c4c4ff', '#b0b0ff', '#bbbbff', '#c8d0f8',
    '#d0d8ff', '#b8c4f8', '#c0caff', '#c8cef8',
    // Lavender & Lilac
    '#e6d5f7', '#d5b8f0', '#c8a0e8', '#dda0dd', '#e6b0f0',
    '#f0d0f0', '#e8cff5', '#d8a8e8', '#e0b8f0', '#cab8e8',
    '#e8d0f8', '#d0b8e8',
    // Wisteria & Mauve
    '#e8b4d0', '#e0a8c8', '#d4a0c0', '#c890b8', '#e8c0d8',
    '#f0c8e0', '#d8b0cc', '#c8a0bc',
    // Warm Cream & Vanilla
    '#fff8f0', '#fef5e7', '#fef9ed', '#fdf0d5', '#fcebd5',
    '#fff3e0', '#fde8c8', '#f5f0e8', '#fcf0e8', '#faf4f0',
    // Greys (13, light → dark)
    '#f5f5f5', '#eeeeee', '#c8c8c8', '#bdbdbd', '#a0a0a0',
    '#909090', '#808080', '#555555', '#4a4a4a', '#424242',
    '#303030', '#1e1e1e', '#0a0a0a',
    // Black & White
    '#000000', '#ffffff',
];

const SWATCH_PALETTE_EARTH = [
    // Terracotta & Adobe
    '#c1440e', '#bf5934', '#b85c38', '#a0522d', '#e07b39',
    '#d2691e', '#cd853f', '#c8714a', '#d4806a', '#e07a5f',
    '#c66b4a', '#b35c40', '#a04030', '#cb5a38',
    // Rust & Burnt Red
    '#8b2020', '#9b3030', '#a52020', '#922b21', '#b03535',
    '#a04000', '#8b3535', '#b8411b', '#963020',
    // Sand & Wheat
    '#f5deb3', '#f0d090', '#e8c97a', '#ddb870', '#d4a858',
    '#c8973a', '#f2d490', '#f5e6c8', '#ede0c4', '#e8d5a3',
    '#d9b88a', '#c8a87a', '#e0c888',
    // Ochre & Mustard
    '#d4a017', '#c8960c', '#b8860b', '#ad7d0a', '#cfb53b',
    '#c5a028', '#b8911e', '#a07828', '#8b6914', '#c09010',
    // Olive & Sage
    '#808000', '#6b8e23', '#556b2f', '#7f9a57', '#8fa36a',
    '#9cae78', '#768a5a', '#6a7c50', '#5c6e44', '#a0a060',
    '#8b8c44', '#9a9850', '#b0af66', '#a8a868',
    // Moss & Deep Green
    '#4a5c3a', '#3d5038', '#2e4030', '#3b4a2e', '#4f6238',
    '#5c7040', '#658050', '#5a6e48', '#3a4828',
    // Walnut & Warm Brown
    '#6b4226', '#7a4a2a', '#8b5a2b', '#7a3b18', '#6a3010',
    '#9a5a30', '#8a4e28', '#7b4020', '#604020',
    // Caramel & Chocolate
    '#a07040', '#906040', '#805030', '#704028', '#603020',
    '#b08048', '#c09050', '#9a7040',
    // Dusty Blue & Denim
    '#4a6fa5', '#3a5f8a', '#4682b4', '#5b7fa6', '#6a8eb0',
    '#3d6080', '#2c5070', '#4e7aaa',
    // Dusty Rose
    '#c4a0a0', '#b89090', '#a87878', '#988888', '#b49898',
    '#c8b0b0', '#9a7878', '#886868', '#a88888',
    // Taupe & Warm Grey
    '#8b8070', '#9a9080', '#7a7060', '#a09080', '#b0a090',
    '#c0b0a0', '#6a6058', '#787068', '#907868',
    // Linen & Cream
    '#faf0e6', '#f5e8d5', '#f0e0c8', '#e8d8b8', '#e0d0a8',
    '#f5f0e8', '#ede8d8', '#f8f0e0',
    // Greys (13, light → dark)
    '#f5f5f5', '#eeeeee', '#c8c8c8', '#bdbdbd', '#a0a0a0',
    '#909090', '#808080', '#555555', '#4a4a4a', '#424242',
    '#303030', '#1e1e1e', '#0a0a0a',
    // Black & White
    '#000000', '#ffffff',
];

const SWATCH_PALETTE_OCEAN = [
    // Deep Abyss
    '#0a1628', '#0d2137', '#0f2a46', '#0e1d30', '#0a1f38',
    '#162540', '#1a2f4a', '#112233', '#0c1e35',
    // Navy & Midnight
    '#001f5b', '#002366', '#00308f', '#003399', '#0a2e6e',
    '#1a3460', '#13274f', '#1c3a6e', '#0d2860',
    // Royal & Cobalt
    '#0047ab', '#003ea8', '#0044cc', '#1a44aa', '#2060b0',
    '#2255aa', '#1f5ea0', '#0054a6', '#0a52a0', '#1050a8',
    // Azure & True Blue
    '#007fba', '#0080c0', '#0088cc', '#0099cc', '#108ab8',
    '#1299cc', '#1890c0', '#1a8cc4', '#2090c8',
    // Bright Aqua
    '#00b4cc', '#00bcd4', '#00c4d8', '#04cfe8', '#0ab8d8',
    '#20c0d4', '#00bbe0', '#18c8dc',
    // Turquoise
    '#00ced1', '#48d1cc', '#40e0d0', '#20d8d4', '#10d0c8',
    '#00c8c0', '#20ccc0', '#38d0c8',
    // Teal
    '#008080', '#009090', '#00a0a0', '#009898', '#157a77',
    '#128880', '#1a8a88', '#006e6e', '#007878', '#109090',
    // Seafoam & Pale Aqua
    '#98e0d8', '#a8e8e8', '#b2e0e0', '#b8f0ec', '#80d8d0',
    '#90d8d0', '#a0e0d8', '#b0e8e0', '#c8f8f4', '#c0f0ec',
    // Tropical Coral
    '#ff6b6b', '#ff7070', '#ff5c5c', '#f06060', '#e85858',
    '#ff8066', '#f07060', '#e86050',
    // Warm Coral & Salmon
    '#fa8072', '#ff8888', '#f08070', '#ff9980', '#f08888',
    '#ff9090', '#e87878', '#f09080',
    // Sea Glass
    '#a8d8d0', '#88b8b0', '#b8e0d8', '#c8e8e0', '#78b0a8',
    '#88c0b8', '#68a8a0', '#98c8c0',
    // Sandy Beach
    '#f5e6c8', '#f0dab8', '#e8d0a8', '#ddc898', '#f0e8d0',
    '#eedec8', '#e8d8b8', '#e0d0c0',
    // Greys (13, light → dark)
    '#f5f5f5', '#eeeeee', '#c8c8c8', '#bdbdbd', '#a0a0a0',
    '#909090', '#808080', '#555555', '#4a4a4a', '#424242',
    '#303030', '#1e1e1e', '#0a0a0a',
    // Black & White
    '#000000', '#ffffff',
];

const SWATCH_PALETTE_JEWEL = [
    // Ruby
    '#9b1b30', '#a52335', '#b52a3e', '#8b0000', '#a00020',
    '#b8001a', '#c23048', '#9c1525', '#aa2030', '#900030', '#780020',
    // Garnet
    '#6e0b14', '#7a1020', '#800c22', '#6b1018', '#722030', '#782838',
    // Sapphire
    '#0f52ba', '#1560bd', '#0047ab', '#1434a4', '#0d3d91',
    '#1b4f9b', '#0e4490', '#1250a8', '#0a3888',
    // Lapis Lazuli
    '#1f305e', '#26619c', '#1f4d8c', '#2860a0', '#204888',
    '#16436e', '#1c4878', '#183c6c',
    // Emerald
    '#046307', '#006b3c', '#009b55', '#028a0f', '#007a33',
    '#008040', '#006634', '#00704a', '#005c30',
    // Jade
    '#00a86b', '#009060', '#008055', '#007050', '#006b45',
    '#008868', '#009870', '#00786a',
    // Amethyst
    '#9966cc', '#7b2fbe', '#8a3fbe', '#7b1fa2', '#8845cc',
    '#9955cc', '#6a1e9e', '#8030c0', '#7020a8', '#8028b0', '#9038c0',
    // Tanzanite
    '#4040c0', '#3535b0', '#4848cc', '#3030a8', '#5050c8',
    '#2828a0', '#3a3ab8', '#4545c5', '#3838b8',
    // Citrine / Golden Topaz
    '#e8a020', '#d4900e', '#c8800a', '#dda520', '#c9930a',
    '#d49510', '#c88508', '#e0a818', '#f0b020',
    // Blue Topaz
    '#0093af', '#007ea7', '#0080a0', '#0090b8', '#0078a0',
    '#0088a8', '#007098', '#009ab8',
    // Turquoise (gem)
    '#30d5c8', '#40d8cc', '#20c8c0', '#18c0b8', '#28ccc0',
    '#38d2c5', '#2ac0ba', '#35ccc5',
    // Kunzite / Rose Quartz
    '#d68bb0', '#c878a0', '#e090bc', '#d080b0', '#c070a0',
    '#e098c0', '#cc80aa', '#da88b4',
    // Peridot
    '#8db600', '#9abf00', '#a0c020', '#90b000', '#8ab010',
    '#96ba10', '#88aa00', '#a2c218',
    // Iolite (violet-blue)
    '#5050a0', '#484898', '#5858a8', '#404090', '#5a5aaa',
    '#4848a0', '#525298', '#4a4aa8',
    // Greys (13, light → dark)
    '#f5f5f5', '#eeeeee', '#c8c8c8', '#bdbdbd', '#a0a0a0',
    '#909090', '#808080', '#555555', '#4a4a4a', '#424242',
    '#303030', '#1e1e1e', '#0a0a0a',
    // Black & White
    '#000000', '#ffffff',
];

const SWATCH_PALETTE_RETRO = [
    // 50s Coral & Aqua
    '#e8604a', '#d4503c', '#e06858', '#c8504a', '#d85840',
    '#e87860', '#cc5040', '#f07868',
    '#5bbcd4', '#4aaabb', '#60c0cc', '#4ab0bc', '#58b8c8',
    '#70c4d0', '#50aab8', '#3898b0',
    // 50s Cream & Blush
    '#fff8e8', '#f8f0d8', '#f5e8cc', '#ede0c0', '#e8d8b4',
    '#f0c8c0', '#e8c0b8', '#deb8b0',
    // 60s Mustard & Avocado
    '#e8c440', '#d4b030', '#c8a020', '#d4b838', '#cc9c18',
    '#c0aa28', '#b89810', '#dcc040',
    '#6b8e3a', '#608030', '#6a8a38', '#5e7828', '#789040',
    '#8a9c4a', '#7a8c38', '#849640',
    // 60s Harvest & Burnt
    '#d4602a', '#c85828', '#cc6030', '#c05020', '#d46838',
    '#b84820', '#c86030', '#d86838',
    // 70s Brown & Tan
    '#8b6240', '#7a5230', '#9a7050', '#886048', '#7c5038',
    '#a07858', '#986848', '#8c6240',
    // 70s Avocado & Gold
    '#a09428', '#908420', '#b0a030', '#9c8e20', '#a89a2a',
    '#b8a838', '#9a9020', '#c0b040',
    // 80s Dusty Mauve & Rose
    '#b08888', '#b89898', '#a88080', '#c0a0a0',
    '#c0889a', '#b07888', '#a87080',
    // 80s Dusty Teal & Slate
    '#608888', '#507878', '#688c8c', '#588484',
    '#6a9090', '#5c8080', '#487070',
    // 90s Dusty Plum & Sage
    '#7a5870', '#806070', '#6e5068',
    '#887890', '#807080', '#706880',
    '#7a8870', '#808870', '#7a8868',
    '#889070', '#708068', '#688060',
    // Greys (13, light → dark)
    '#f5f5f5', '#eeeeee', '#c8c8c8', '#bdbdbd', '#a0a0a0',
    '#909090', '#808080', '#555555', '#4a4a4a', '#424242',
    '#303030', '#1e1e1e', '#0a0a0a',
    // Black & White
    '#000000', '#ffffff',
];

const SWATCH_PALETTE_SKIN = [
    // Fair / Porcelain (type I–II)
    '#ffe8dc', '#fddacb', '#fdd0bc', '#fcc8b0', '#fbbea4',
    '#fab498', '#f9aa8e', '#f8a084', '#f7967a',
    // Light (type II–III)
    '#f6907a', '#f08070', '#e87868', '#e07060', '#d86858',
    '#d0605a', '#c85850', '#c05048', '#b84840',
    // Light-medium (type III)
    '#e8a880', '#e0a078', '#d89870', '#d09068', '#c88860',
    '#c08058', '#b87850', '#b07050', '#a86848',
    // Medium (type III–IV)
    '#c87848', '#c07850', '#b86840', '#b06040', '#a85838',
    '#a05030', '#985028', '#904828', '#884020',
    // Medium-tan (type IV)
    '#9a6040', '#8e5438', '#885030', '#804830', '#784028',
    '#703828', '#683020', '#602820', '#583018',
    // Tan / Olive (type IV–V)
    '#8a5838', '#7e5030', '#784828', '#704028', '#683820',
    '#603018', '#5a2c18', '#4e1e10', '#482010',
    // Brown (type V)
    '#6a3820', '#602e18', '#582818', '#502010', '#48180a',
    '#441808', '#401408', '#3c1208', '#381008',
    // Deep Brown (type V–VI)
    '#3a1008', '#340e06', '#300c06', '#2c0c04', '#280a04',
    '#240804', '#200804', '#1c0602',
    // Warm undertones (golden/peachy)
    '#f0c090', '#e8b880', '#e0b070', '#d8a860', '#d0a050',
    '#c89840', '#c09030', '#b88820', '#b08010',
    '#d4aa78', '#c49a68', '#b48a58', '#a47a48', '#946a38', '#845a28',
    // Cool undertones (pink/rosy)
    '#f0a8a0', '#e89898', '#e08888', '#d87878', '#d07070',
    '#c86868', '#c06060', '#b85858', '#b05050',
    // Blush & Contour tones
    '#e8a0a8', '#d890a0', '#c88090', '#b87080', '#a86070',
    '#c8b0a0', '#b8a090', '#a89080', '#988070', '#887060',
    // Greys (13, light → dark)
    '#f5f5f5', '#eeeeee', '#c8c8c8', '#bdbdbd', '#a0a0a0',
    '#909090', '#808080', '#555555', '#4a4a4a', '#424242',
    '#303030', '#1e1e1e', '#0a0a0a',
    // Black & White
    '#000000', '#ffffff',
];

const SWATCH_PALETTE_METAL = [
    // Yellow Gold
    '#ffd700', '#f5cc00', '#e8c000', '#dab800', '#cfb53b',
    '#c8a830', '#c0a020', '#b89810', '#b09000', '#a88808',
    // Rose Gold
    '#b76e79', '#c07880', '#c88088', '#d08898', '#c87888',
    '#b87080', '#d090a0', '#c888a0', '#cc8898', '#b86878',
    // White Gold / Platinum
    '#e5e4e2', '#dddcd8', '#d5d4d0', '#d0cfcc', '#c8c8c4',
    '#c0c0bc', '#b8b8b4', '#ebebeb', '#e0e0dc', '#f0efec',
    // Silver & Chrome
    '#c0c0c0', '#b8b8b8', '#c4c4c4', '#d0d0d0', '#d8d8d8',
    '#b0b0b0', '#a8a8a8', '#e0e0e0', '#a4a4a4', '#bcbcbc',
    // Pewter
    '#8d9085', '#96938a', '#8e8b80', '#a09888', '#988e82',
    '#90887a', '#887e70', '#807468', '#786c60',
    // Bronze
    '#cd7f32', '#c47828', '#bc7120', '#b46a18', '#ac6310',
    '#a45c08', '#c88030', '#d08840', '#b87028',
    // Copper
    '#b87333', '#c07828', '#ca7a28', '#b06820', '#a86018',
    '#a05810', '#985008', '#d08040', '#bc7030',
    // Verdigris (aged copper)
    '#43b3ae', '#3da89a', '#389d8c', '#33927e', '#2e8770',
    '#3aaa98', '#40b0a0', '#38a090',
    // Brass
    '#b5a642', '#ad9e38', '#a5962e', '#9d8e24', '#c0b050',
    '#b8a848', '#a89830', '#908020', '#c4a830', '#ba9c20', '#d0b840', '#9a7c08',
    // Gunmetal & Steel
    '#2a3439', '#333d42', '#3d4952', '#2c3e50', '#3a4a56',
    '#44505e', '#4a5868', '#506070', '#566870',
    // Iron & Titanium
    '#434c5e', '#4a5268', '#505870', '#3e4860', '#484e60',
    '#787d88', '#808590', '#888d98', '#7a7f8a',
    // Greys (13, light → dark)
    '#f5f5f5', '#eeeeee', '#c8c8c8', '#bdbdbd', '#a0a0a0',
    '#909090', '#808080', '#555555', '#4a4a4a', '#424242',
    '#303030', '#1e1e1e', '#0a0a0a',
    // Black & White
    '#000000', '#ffffff',
];

const SWATCH_PALETTE_NORDIC = [
    // Ice & Arctic Blue
    '#e8f4fc', '#daeef8', '#cce8f4', '#bee2f0', '#b0dcec',
    '#a2d6e8', '#94d0e4', '#86cae0', '#78c4dc', '#70bcd8', '#60b4d0',
    // Powder Blue & Slate
    '#b0c8e0', '#a0b8d0', '#90a8c0', '#8098b0', '#7088a0',
    '#607890', '#506880', '#405870', '#304860',
    // Midnight & Deep Navy
    '#1e3050', '#182840', '#202840', '#1a2838', '#1c2a42',
    '#243050', '#1e2c48', '#162440', '#202e50',
    // Pewter & Steel Blue-Grey
    '#8090a0', '#7888a0', '#8898a8', '#8090a8', '#7a88a2',
    '#909aaa', '#98a2b0', '#8898b0', '#7890a8',
    // Stone & Warm Grey
    '#a0a098', '#989090', '#909098', '#a0a0a8', '#989890',
    '#a8a8a0', '#b0b0a8', '#9e9e96', '#989892',
    // Dusty Sage
    '#8a9e8a', '#9aac9a', '#8e9e8c', '#a0ae9e', '#98a898',
    '#8c9c8a', '#a4b0a2', '#96a494', '#8a9888', '#92a890', '#a2b8a0',
    // Muted Forest
    '#2e4030', '#364838', '#3a5040', '#304030', '#3a4a38',
    '#405040', '#384838', '#2c3c2c', '#344038',
    // Dusty Rose (Scandi pink)
    '#c0909a', '#b08090', '#c898a0', '#b89098', '#c8a0a8',
    '#b888a0', '#c09098', '#b08898', '#c8a0aa',
    // Birch & Warm Linen
    '#f0e8d8', '#ece0d0', '#f0eae0', '#e8e0d0', '#eee8dc',
    '#e8e2d8', '#f5f0e8', '#ece8e0', '#f0ece4',
    // Muted Teal
    '#6a9090', '#7a9898', '#5a8888', '#6a9898', '#789090',
    '#608888', '#709898', '#6898a0', '#709090', '#587888', '#508090',
    // Terracotta (Scandi warmth)
    '#b06858', '#a05848', '#c07868', '#b06860', '#a86058',
    '#986050', '#c27a6a', '#b07060', '#a86860',
    // Greys (13, light → dark)
    '#f5f5f5', '#eeeeee', '#c8c8c8', '#bdbdbd', '#a0a0a0',
    '#909090', '#808080', '#555555', '#4a4a4a', '#424242',
    '#303030', '#1e1e1e', '#0a0a0a',
    // Black & White
    '#000000', '#ffffff',
];

const SWATCH_PALETTE_AUTUMN = [
    // Burgundy & Wine
    '#6b0f1a', '#7d1228', '#8c1336', '#5c0c16', '#9b1744',
    '#7a1020', '#671018', '#8b1130', '#a01c48', '#4e0810',
    '#601018', '#9a1840', '#7e1525', '#6e1228', '#581018',
    // Rust & Terracotta
    '#b73a1a', '#a53018', '#c84028', '#9a2810', '#d44830',
    '#8e2008', '#b33218', '#c03820', '#a02a10', '#bf3c22',
    '#7c1800', '#d04028', '#a82c12', '#9c2808', '#c64030',
    // Pumpkin & Burnt Orange
    '#e05a00', '#d04a00', '#e86800', '#c84000', '#f07010',
    '#cc4400', '#da5800', '#e46200', '#c03800', '#f07800',
    '#c84800', '#e05c00', '#d05200', '#e46a00', '#c84200',
    // Harvest Gold & Amber
    '#c86800', '#d47808', '#e08810', '#cc7000', '#da8010',
    '#e69818', '#d48808', '#e09010', '#cc8000', '#d87808',
    '#e49010', '#c87000', '#da8808', '#e89c18', '#c87808',
    // Walnut & Chestnut
    '#5c2e0a', '#6b380e', '#7a4214', '#4e2808', '#8a4c1a',
    '#623210', '#703c14', '#5a2c08', '#7e4618', '#4a2406',
    '#684016', '#7c4818', '#522a0a', '#8a5020', '#603810',
    // Olive & Forest
    '#3e4c1e', '#4a5824', '#566428', '#38481a', '#526020',
    '#445420', '#3c5020', '#506030', '#485c28', '#3a4e1e',
    '#546224', '#405820', '#4e6028', '#3c5018', '#5a6830',
    // Plum & Berry
    '#6b2040', '#7a2850', '#8a305e', '#5e1838', '#7a2258',
    '#8c3468', '#601c3c', '#783050', '#5a1c3a', '#8a2e60',
    '#6e2448', '#7c2c54', '#5c1c3c', '#8a3464', '#6a2040',
    // Greys (13, light → dark)
    '#f5f5f5', '#eeeeee', '#c8c8c8', '#bdbdbd', '#a0a0a0',
    '#909090', '#808080', '#555555', '#4a4a4a', '#424242',
    '#303030', '#1e1e1e', '#0a0a0a',
    // Black & White
    '#000000', '#ffffff',
];

const SWATCH_PALETTE_MUTED = [
    // Light (S=30% L=82%)
    '#dfc3c3', '#dfcec3', '#dfd9c3', '#d9dfc3', '#cedfc3', '#c3dfc3', '#c3dfce', '#c3dfd9', '#c3d9df', '#c3cedf', '#c3c3df', '#cec3df', '#d9c3df', '#dfc3d9', '#dfc3ce',
    // Soft (S=38% L=70%)
    '#d09595', '#d0ad95', '#d0c495', '#c4d095', '#add095', '#95d095', '#95d0ad', '#95d0c4', '#95c4d0', '#95add0', '#9595d0', '#ad95d0', '#c495d0', '#d095c4', '#d095ad',
    // Mid-Light (S=46% L=60%)
    '#c86a6a', '#c8906a', '#c8b56a', '#b5c86a', '#90c86a', '#6ac86a', '#6ac890', '#6ac8b5', '#6ab5c8', '#6a90c8', '#6a6ac8', '#906ac8', '#b56ac8', '#c86ab5', '#c86a90',
    // Pure (S=52% L=50%)
    '#c23d3d', '#c2723d', '#c2a73d', '#a7c23d', '#72c23d', '#3dc23d', '#3dc272', '#3dc2a7', '#3da7c2', '#3d72c2', '#3d3dc2', '#723dc2', '#a73dc2', '#c23da7', '#c23d72',
    // Mid-Dark (S=50% L=40%)
    '#993333', '#995c33', '#998533', '#859933', '#5c9933', '#339933', '#33995c', '#339985', '#338599', '#335c99', '#333399', '#5c3399', '#853399', '#993385', '#99335c',
    // Dark (S=46% L=32%)
    '#772c2c', '#774a2c', '#77682c', '#68772c', '#4a772c', '#2c772c', '#2c774a', '#2c7768', '#2c6877', '#2c4a77', '#2c2c77', '#4a2c77', '#682c77', '#772c68', '#772c4a',
    // Deep (S=42% L=23%)
    '#532222', '#533622', '#534922', '#495322', '#365322', '#225322', '#225336', '#225349', '#224953', '#223653', '#222253', '#362253', '#492253', '#532249', '#532236',
    // Ultra Deep (S=38% L=15%)
    '#351818', '#352318', '#352f18', '#2f3518', '#233518', '#183518', '#183523', '#18352f', '#182f35', '#182335', '#181835', '#231835', '#2f1835', '#35182f', '#351823',
    // Greys (13, light → dark)
    '#f5f5f5', '#eeeeee', '#c8c8c8', '#bdbdbd', '#a0a0a0',
    '#909090', '#808080', '#555555', '#4a4a4a', '#424242',
    '#303030', '#1e1e1e', '#0a0a0a',
    // Black & White
    '#000000', '#ffffff',
];

const SWATCH_PALETTE_POP = [
    // Light (S=100% L=75%)
    '#ff8080', '#ffb380', '#ffe680', '#e6ff80', '#b3ff80', '#80ff80', '#80ffb3', '#80ffe5', '#80e5ff', '#80b3ff', '#8080ff', '#b380ff', '#e580ff', '#ff80e5', '#ff80b3',
    // Bright (S=100% L=68%)
    '#ff5c5c', '#ff9d5c', '#ffde5c', '#deff5c', '#9dff5c', '#5cff5c', '#5cff9d', '#5cffde', '#5cdeff', '#5c9dff', '#5c5cff', '#9d5cff', '#de5cff', '#ff5cde', '#ff5c9d',
    // Mid-Light (S=98% L=62%)
    '#fd3f3f', '#fd8b3f', '#fdd73f', '#d7fd3f', '#8bfd3f', '#3ffd3f', '#3ffd8b', '#3ffdd7', '#3fd7fd', '#3f8bfd', '#3f3ffd', '#8b3ffd', '#d73ffd', '#fd3fd7', '#fd3f8b',
    // Standard (S=96% L=57%)
    '#fb2828', '#fb7c28', '#fbd128', '#d1fb28', '#7cfb28', '#28fb28', '#28fb7c', '#28fbd1', '#28d1fb', '#287cfb', '#2828fb', '#7c28fb', '#d128fb', '#fb28d1', '#fb287c',
    // Mid (S=94% L=52%)
    '#f81212', '#f86e12', '#f8ca12', '#caf812', '#6ef812', '#12f812', '#12f86e', '#12f8ca', '#12caf8', '#126ef8', '#1212f8', '#6e12f8', '#ca12f8', '#f812ca', '#f8126e',
    // Dark (S=92% L=47%)
    '#e60a0a', '#e6620a', '#e6ba0a', '#bae60a', '#62e60a', '#0ae60a', '#0ae662', '#0ae6ba', '#0abae6', '#0a62e6', '#0a0ae6', '#620ae6', '#ba0ae6', '#e60aba', '#e60a62',
    // Deep (S=90% L=42%)
    '#cb0b0b', '#cb580b', '#cba50b', '#a5cb0b', '#58cb0b', '#0bcb0b', '#0bcb58', '#0bcba5', '#0ba5cb', '#0b58cb', '#0b0bcb', '#580bcb', '#a50bcb', '#cb0ba5', '#cb0b58',
    // Greys (13, light → dark)
    '#f5f5f5', '#eeeeee', '#c8c8c8', '#bdbdbd', '#a0a0a0',
    '#909090', '#808080', '#555555', '#4a4a4a', '#424242',
    '#303030', '#1e1e1e', '#0a0a0a',
    // Black & White
    '#000000', '#ffffff',
];

const SWATCH_PALETTE_STONE = [
    // Near White (S=10% L=92%)
    '#ede9e9', '#edeae9', '#edece9', '#ecede9', '#eaede9', '#e9ede9', '#e9edea', '#e9edec', '#e9eced', '#e9eaed', '#e9e9ed', '#eae9ed', '#ece9ed', '#ede9ec', '#ede9ea',
    // Light (S=8% L=80%)
    '#d0c8c8', '#d0cbc8', '#d0cec8', '#ced0c8', '#cbd0c8', '#c8d0c8', '#c8d0cb', '#c8d0ce', '#c8ced0', '#c8cbd0', '#c8c8d0', '#cbc8d0', '#cec8d0', '#d0c8ce', '#d0c8cb',
    // Mid-Light (S=8% L=68%)
    '#b4a7a7', '#b4aca7', '#b4b1a7', '#b1b4a7', '#acb4a7', '#a7b4a7', '#a7b4ac', '#a7b4b1', '#a7b1b4', '#a7acb4', '#a7a7b4', '#aca7b4', '#b1a7b4', '#b4a7b1', '#b4a7ac',
    // Mid (S=8% L=56%)
    '#988686', '#988d86', '#989486', '#949886', '#8d9886', '#869886', '#86988d', '#869894', '#869498', '#868d98', '#868698', '#8d8698', '#948698', '#988694', '#98868d',
    // Mid-Dark (S=8% L=45%)
    '#7c6a6a', '#7c716a', '#7c786a', '#787c6a', '#717c6a', '#6a7c6a', '#6a7c71', '#6a7c78', '#6a787c', '#6a717c', '#6a6a7c', '#716a7c', '#786a7c', '#7c6a78', '#7c6a71',
    // Dark (S=8% L=34%)
    '#5e5050', '#5e5550', '#5e5b50', '#5b5e50', '#555e50', '#505e50', '#505e55', '#505e5b', '#505b5e', '#50555e', '#50505e', '#55505e', '#5b505e', '#5e505b', '#5e5055',
    // Deep (S=8% L=23%)
    '#3f3636', '#3f3a36', '#3f3d36', '#3d3f36', '#3a3f36', '#363f36', '#363f3a', '#363f3d', '#363d3f', '#363a3f', '#36363f', '#3a363f', '#3d363f', '#3f363d', '#3f363a',
    // Near Black (S=8% L=13%)
    '#241e1e', '#24211e', '#24231e', '#23241e', '#21241e', '#1e241e', '#1e2421', '#1e2423', '#1e2324', '#1e2124', '#1e1e24', '#211e24', '#231e24', '#241e23', '#241e21',
    // Greys (13, light → dark)
    '#f5f5f5', '#eeeeee', '#c8c8c8', '#bdbdbd', '#a0a0a0',
    '#909090', '#808080', '#555555', '#4a4a4a', '#424242',
    '#303030', '#1e1e1e', '#0a0a0a',
    // Black & White
    '#000000', '#ffffff',
];

const SWATCH_PALETTE_SPECTRUM = [
    // Ultra Light (S=100% L=90%)
    '#ffcccc', '#ffe0cc', '#fff5cc', '#f5ffcc', '#e0ffcc', '#ccffcc', '#ccffe0', '#ccfff5', '#ccf5ff', '#cce0ff', '#ccccff', '#e0ccff', '#f5ccff', '#ffccf5', '#ffcce0',
    // Light (S=100% L=76%)
    '#ff8585', '#ffb685', '#ffe785', '#e7ff85', '#b6ff85', '#85ff85', '#85ffb6', '#85ffe7', '#85e7ff', '#85b6ff', '#8585ff', '#b685ff', '#e785ff', '#ff85e7', '#ff85b6',
    // Medium Light (S=100% L=62%)
    '#ff3d3d', '#ff8b3d', '#ffd83d', '#d8ff3d', '#8bff3d', '#3dff3d', '#3dff8b', '#3dffd8', '#3dd8ff', '#3d8bff', '#3d3dff', '#8b3dff', '#d83dff', '#ff3dd8', '#ff3d8b',
    // Pure (S=100% L=50%)
    '#ff0000', '#ff6600', '#ffcc00', '#ccff00', '#66ff00', '#00ff00', '#00ff66', '#00ffcc', '#00ccff', '#0066ff', '#0000ff', '#6600ff', '#cc00ff', '#ff00cc', '#ff0066',
    // Medium Dark (S=100% L=40%)
    '#cc0000', '#cc5200', '#cca300', '#a3cc00', '#52cc00', '#00cc00', '#00cc52', '#00cca3', '#00a3cc', '#0052cc', '#0000cc', '#5200cc', '#a300cc', '#cc00a3', '#cc0052',
    // Dark (S=100% L=30%)
    '#990000', '#993d00', '#997a00', '#7a9900', '#3d9900', '#009900', '#00993d', '#00997a', '#007a99', '#003d99', '#000099', '#3d0099', '#7a0099', '#99007a', '#99003d',
    // Deep (S=100% L=20%)
    '#660000', '#662900', '#665200', '#526600', '#296600', '#006600', '#006629', '#006652', '#005266', '#002966', '#000066', '#290066', '#520066', '#660052', '#660029',
    // Ultra Deep (S=100% L=11%)
    '#380000', '#381600', '#382d00', '#2d3800', '#163800', '#003800', '#003816', '#00382d', '#002d38', '#001638', '#000038', '#160038', '#2d0038', '#38002d', '#380016',
    // Greys (13, light → dark)
    '#f5f5f5', '#eeeeee', '#c8c8c8', '#bdbdbd', '#a0a0a0',
    '#909090', '#808080', '#555555', '#4a4a4a', '#424242',
    '#303030', '#1e1e1e', '#0a0a0a',
    // Black & White
    '#000000', '#ffffff',
];

const SWATCH_PALETTES = {
    classic: SWATCH_PALETTE,
    spectrum: SWATCH_PALETTE_SPECTRUM,
    vibrant: SWATCH_PALETTE_VIBRANT,
    pastel: SWATCH_PALETTE_PASTEL,
    earth: SWATCH_PALETTE_EARTH,
    ocean: SWATCH_PALETTE_OCEAN,
    jewel: SWATCH_PALETTE_JEWEL,
    retro: SWATCH_PALETTE_RETRO,
    skin: SWATCH_PALETTE_SKIN,
    metal: SWATCH_PALETTE_METAL,
    nordic: SWATCH_PALETTE_NORDIC,
    autumn: SWATCH_PALETTE_AUTUMN,
    muted: SWATCH_PALETTE_MUTED,
    pop: SWATCH_PALETTE_POP,
    stone: SWATCH_PALETTE_STONE,
};

const UI = {
    draggedElement: null,
    draggedData: null,
    _swatchTargetId: null,
    _swatchActiveTab: 'classic',

    // Menu tab state
    currentMenuTab: 1,
    selectedCategoryId: null,
    newlyAddedSliceIds: [],
    preselectedSliceId: null,

    // Convert URLs in text to clickable links (for HTML contexts)
    linkifyUrls(text) {
        if (!text) return text;
        return text.replace(/(https?:\/\/[^\s<>"']+)/g, '<a href="$1" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:#1a73e8;text-decoration:underline;">$1</a>');
    },

    // Returns inline CSS border + background string for schedule pills based on date proximity.
    // Colours come from CSS custom properties set by themes.js — no hardcoded hex values here.
    getScheduleBorderStyle(dateStr, timeStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T' + (timeStr || '00:00'));
        const fade = localStorage.getItem('brainpie-pill-fade') !== '0';
        if (ChartRenderer.isPast(date))     return 'background: var(--sched-color-past); border: 2px solid var(--sched-color-past); color: var(--sched-color-past-text);';
        if (ChartRenderer.isToday(date))    return `background: var(--sched-color-today); border: 2px solid var(--sched-color-today${fade ? '' : '-border'}); color: var(--sched-color-today-text); font-weight: 600;`;
        if (ChartRenderer.isTomorrow(date)) return `background: var(--sched-color-tomorrow); border: 2px solid var(--sched-color-tomorrow${fade ? '' : '-border'}); color: var(--sched-color-tomorrow-text); font-weight: 600;`;
        if (ChartRenderer.isThisWeek(date)) return `background: var(--sched-color-week); border: 2px solid var(--sched-color-week${fade ? '' : '-border'}); color: var(--sched-color-week-text);`;
        return `background: var(--sched-color-base); border: 1.5px solid var(--sched-color-${fade ? 'base' : 'default-border'}); color: var(--sched-color-base-text);`;
    },

    getSchedulePillOpacityForDate(dateStr, timeStr, isPriority = false) {
        if (!dateStr) return 1;
        const date = new Date(dateStr + 'T' + (timeStr || '00:00'));
        const pillColor = ChartRenderer.isPast(date)     ? 'var(--sched-color-past)'
                        : ChartRenderer.isToday(date)    ? 'var(--sched-color-today)'
                        : ChartRenderer.isTomorrow(date) ? 'var(--sched-color-tomorrow)'
                        : ChartRenderer.isThisWeek(date) ? 'var(--sched-color-week)'
                        :                                   'var(--sched-color-base)';
        return ChartRenderer.getSchedulePillOpacity(pillColor, isPriority);
    },

    // Get the relevant date string for a spoke's schedule (single or repeating)
    getSpokeDateInfo(spoke) {
        if (typeof spoke !== 'object') return { dateStr: null, timeStr: null };
        const type = (spoke.type === 'action' ? 'list' : spoke.type) || 'static';
        if (type === 'single' && spoke.scheduled && spoke.scheduled.date) {
            return { dateStr: spoke.scheduled.date, timeStr: spoke.scheduled.time };
        }
        if (type === 'repeating' && spoke.metadata && spoke.metadata.recurrence) {
            const rec = spoke.metadata.recurrence;
            if (rec.startDate) {
                const nextDate = ChartRenderer.getNextOccurrence(rec);
                return { dateStr: nextDate || rec.startDate, timeStr: rec.time };
            }
        }
        return { dateStr: null, timeStr: null };
    },

    showConfigSignInBanner() {
        const banner = document.createElement('div');
        banner.id = 'config-signin-banner';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10000;background:#1a73e8;color:#fff;display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 20px;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
        banner.innerHTML = `
            <span>Sign in with Google to sync data from the cloud</span>
            <button onclick="UI.signInWithGoogle().then(()=>{document.getElementById('config-signin-banner')?.remove()}).catch(()=>{})"
                style="background:#fff;color:#1a73e8;border:none;padding:8px 20px;border-radius:4px;font-weight:bold;cursor:pointer;font-size:14px;">Sign in with Google</button>
            <button onclick="this.parentElement.remove()"
                style="background:none;border:none;color:#fff;cursor:pointer;font-size:20px;padding:0 4px;opacity:0.7;">\u2715</button>
        `;
        document.body.prepend(banner);
    },

    showMenu(skipExpandedCheck) {
        // If zoomed into a category or slice, pre-select it
        if (!skipExpandedCheck) {
            const ev = ChartRenderer.expandedView;
            if (ev) {
                if (ev.type === 'slice' && ev.itemId) {
                    return this.showMenuForSlice(ev.categoryId, ev.itemId);
                }
                if (ev.type === 'category' && ev.categoryId) {
                    return this.showMenuForCategory(ev.categoryId);
                }
            }
        }

        // Reset state
        this.currentMenuTab = 1;
        this.selectedCategoryId = null;
        this.newlyAddedSliceIds = [];
        this.preselectedSliceId = null;
        this.expandedSpokeActions = {};

        // Clear Tab 2 state
        const tab2SpokesList = document.getElementById('tab2-spokes-list');
        if (tab2SpokesList) {
            tab2SpokesList.innerHTML = '<div class="tab2-spokes-empty">Select a slice to manage spokes</div>';
        }
        const spokesSection = document.getElementById('spokes-section');
        if (spokesSection) {
            spokesSection.style.opacity = '0.5';
            spokesSection.style.pointerEvents = 'none';
        }
        const tab2SliceSelect = document.getElementById('tab2-slice-select');
        if (tab2SliceSelect) {
            tab2SliceSelect.innerHTML = '<option value="">Select a slice...</option>';
        }

        // Reset tab display
        document.querySelectorAll('.menu-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === '1');
        });
        document.querySelectorAll('.menu-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === 'menu-tab-1');
        });

        // Reset category mode to "existing"
        const existingRadio = document.querySelector('input[name="category-mode"][value="existing"]');
        if (existingRadio) existingRadio.checked = true;
        this.toggleCategoryMode('existing');

        // Reset slice section
        this.disableSliceSection();

        // Populate category dropdown
        this.populateCategoryDropdown();

        // Clear forms
        this.clearCategoryInputs();
        this.clearSliceInputs();

        document.getElementById('menu-overlay').classList.add('active');

        // Notify tutorial
        if (typeof TutorialManager !== 'undefined') {
            TutorialManager.notifyEvent('menu-opened');
        }
    },

    closeMenu() {
        document.getElementById('menu-overlay').classList.remove('active');

        // Notify tutorial
        if (typeof TutorialManager !== 'undefined') {
            TutorialManager.notifyEvent('menu-closed');
        }
        // Reset state
        this.currentMenuTab = 1;
        this.selectedCategoryId = null;
        this.newlyAddedSliceIds = [];
        App.render();
    },

    showMenuForCategory(categoryId) {
        // First show the menu normally
        this.showMenu(true);

        // Then pre-select the category
        const existingRadio = document.querySelector('input[name="category-mode"][value="existing"]');
        if (existingRadio) existingRadio.checked = true;

        document.getElementById('item-category').value = categoryId;
        this.toggleCategoryMode('existing');
        this.onCategorySelected();
    },

    showMenuForSlice(categoryId, sliceId) {
        // First show the menu normally
        this.showMenu(true);

        // Pre-select the category
        this.selectedCategoryId = categoryId;
        const existingRadio = document.querySelector('input[name="category-mode"][value="existing"]');
        if (existingRadio) existingRadio.checked = true;

        document.getElementById('item-category').value = categoryId;
        this.toggleCategoryMode('existing');
        this.onCategorySelected();

        // Set the slice to pre-select and switch to Tab 2
        this.preselectedSliceId = sliceId;
        this.switchMenuTab(2);
    },

    switchMenuTab(tabNumber) {
        this.currentMenuTab = tabNumber;

        // Update tab buttons
        document.querySelectorAll('.menu-tab').forEach(tab => {
            tab.classList.toggle('active', parseInt(tab.dataset.tab) === tabNumber);
        });

        // Update tab content
        document.querySelectorAll('.menu-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `menu-tab-${tabNumber}`);
        });

        // When switching to Tab 2, populate the slice dropdown
        if (tabNumber === 2) {
            // Reset expanded states
            this.expandedSpokeActions = {};
            this.populateTab2SliceDropdown();
        }
    },

    toggleCategoryMode(mode) {
        const newForm = document.getElementById('new-category-form');
        const existingForm = document.getElementById('existing-category-form');

        if (mode === 'new') {
            newForm.style.display = 'flex';
            existingForm.style.display = 'none';
            this.disableSliceSection();
            this.selectedCategoryId = null;
        } else {
            newForm.style.display = 'none';
            existingForm.style.display = 'flex';
            // Check if a category is already selected
            const categorySelect = document.getElementById('item-category');
            if (categorySelect.value) {
                this.onCategorySelected();
            } else {
                this.disableSliceSection();
            }
        }
    },

    populateCategoryDropdown() {
        const select = document.getElementById('item-category');
        select.innerHTML = '<option value="">Select category...</option>';

        DataModel.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    },

    onCategorySelected() {
        const select = document.getElementById('item-category');
        this.selectedCategoryId = select.value;

        if (this.selectedCategoryId) {
            this.enableSliceSection();
            this.renderSlicesForCategory(this.selectedCategoryId);
        } else {
            this.disableSliceSection();
        }
    },

    enableSliceSection() {
        const section = document.getElementById('slice-section');
        const hint = document.getElementById('slice-hint');
        const continueBtn = document.getElementById('continue-to-spokes-btn');

        section.style.opacity = '1';
        section.style.pointerEvents = 'auto';
        hint.textContent = '';

        // Enable continue button if there are slices
        const category = DataModel.categories.find(c => c.id === this.selectedCategoryId);
        continueBtn.disabled = !(category && category.items.length > 0);
    },

    disableSliceSection() {
        const section = document.getElementById('slice-section');
        const hint = document.getElementById('slice-hint');
        const slicesContainer = document.getElementById('slices-in-category');
        const continueBtn = document.getElementById('continue-to-spokes-btn');

        section.style.opacity = '0.5';
        section.style.pointerEvents = 'none';
        hint.textContent = 'Select or create a category first';
        slicesContainer.style.display = 'none';
        continueBtn.disabled = true;
    },

    addCategoryFromTab1() {
        const name = document.getElementById('new-category-name').value.trim();
        const color = document.getElementById('new-category-color').value;

        if (!name) {
            alert('Please enter a category name');
            return;
        }

        const categoryId = DataModel.addCategory(name, color);
        this.selectedCategoryId = categoryId;

        // Switch to existing category mode and select the new category
        const existingRadio = document.querySelector('input[name="category-mode"][value="existing"]');
        if (existingRadio) existingRadio.checked = true;

        this.populateCategoryDropdown();
        document.getElementById('item-category').value = categoryId;
        this.toggleCategoryMode('existing');
        this.onCategorySelected();

        // Clear category inputs
        this.clearCategoryInputs();

        // Render to update the main UI
        App.render();
    },

    addSliceFromTab1() {
        if (!this.selectedCategoryId) {
            alert('Please select or create a category first');
            return;
        }

        const name = document.getElementById('item-name').value.trim();
        let percentage = parseFloat(document.getElementById('item-percentage').value);
        const color = document.getElementById('item-color').value;

        if (!name) {
            alert('Please enter a slice name');
            return;
        }

        // Default to 20% if no percentage is provided
        if (!percentage || percentage <= 0) {
            percentage = 20;
        }

        // Add slice without spokes (spokes will be added in Tab 2)
        const sliceId = DataModel.addItem(this.selectedCategoryId, name, percentage, color, []);

        // Track as newly added
        this.newlyAddedSliceIds.push(sliceId);

        // Refresh the slice list
        this.renderSlicesForCategory(this.selectedCategoryId);

        // Clear slice inputs
        this.clearSliceInputs();

        // Enable continue button
        document.getElementById('continue-to-spokes-btn').disabled = false;

        // Render to update the main UI
        App.render();

        // Notify tutorial
        if (typeof TutorialManager !== 'undefined') {
            TutorialManager.notifyEvent('slice-added', { itemId: sliceId });
        }
    },

    clearSliceInputs() {
        document.getElementById('item-name').value = '';
        document.getElementById('item-percentage').value = '';
        document.getElementById('item-color').value = this.getRandomColor();
    },

    renderSlicesForCategory(categoryId) {
        const category = DataModel.categories.find(c => c.id === categoryId);
        const container = document.getElementById('slices-in-category');
        const list = document.getElementById('category-slices-list');

        if (!category || category.items.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        list.innerHTML = '';

        category.items.forEach(item => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:8px;';

            const star = document.createElement('button');
            star.className = `priority-star-btn ${this.isPrioritised({type:'slice', categoryId, itemId:item.id}) ? 'active' : ''}`;
            star.innerHTML = '&#9733;';
            star.title = 'Add to priorities';
            star.style.flexShrink = '0';
            star.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addToPriorities({type:'slice', categoryId, itemId:item.id});
                star.classList.toggle('active', this.isPrioritised({type:'slice', categoryId, itemId:item.id}));
            });

            const li = document.createElement('li');
            const isNew = this.newlyAddedSliceIds.includes(item.id);
            if (isNew) li.classList.add('newly-added');
            li.style.cssText = 'flex:1;cursor:pointer;';

            li.innerHTML = `
                <span class="slice-name">${item.name}</span>
                <span class="slice-percentage">${item.percentage.toFixed(1)}%</span>
                ${isNew ? '<span class="new-badge">New</span>' : ''}
                <span class="slice-edit-hint">Edit →</span>
            `;

            li.addEventListener('click', () => {
                this.selectSliceAndGoToTab2(categoryId, item.id);
            });

            row.appendChild(star);
            row.appendChild(li);
            list.appendChild(row);
        });
    },

    selectSliceAndGoToTab2(categoryId, itemId) {
        // Store the selection for Tab 2
        this.selectedCategoryId = categoryId;
        this.preselectedSliceId = itemId;

        // Switch to Tab 2
        this.switchMenuTab(2);
    },

    // Tab 2 methods
    populateTab2SliceDropdown() {
        const select = document.getElementById('tab2-slice-select');
        const categoryLabel = document.getElementById('tab2-category-name');
        const spokesSection = document.getElementById('spokes-section');
        const spokesList = document.getElementById('tab2-spokes-list');

        // Reset to default state first
        select.innerHTML = '<option value="">Select a slice...</option>';
        spokesSection.style.opacity = '0.5';
        spokesSection.style.pointerEvents = 'none';
        spokesList.innerHTML = '<div class="tab2-spokes-empty">Select a slice to manage spokes</div>';

        // If we have a selected category from Tab 1, use it
        if (this.selectedCategoryId) {
            const category = DataModel.categories.find(c => c.id === this.selectedCategoryId);
            if (category) {
                categoryLabel.textContent = `in ${category.name}`;

                let hasPreselection = false;
                category.items.forEach(item => {
                    const option = document.createElement('option');
                    option.value = `${category.id}|${item.id}`;
                    option.textContent = item.name;

                    // Pre-select: first check for explicitly preselected slice (from clicking in list)
                    if (this.preselectedSliceId && item.id === this.preselectedSliceId) {
                        option.selected = true;
                        hasPreselection = true;
                    }
                    // Otherwise pre-select the most recently added slice
                    else if (!this.preselectedSliceId &&
                             this.newlyAddedSliceIds.length > 0 &&
                             item.id === this.newlyAddedSliceIds[this.newlyAddedSliceIds.length - 1]) {
                        option.selected = true;
                        hasPreselection = true;
                    }
                    select.appendChild(option);
                });

                // Clear preselection after using it
                this.preselectedSliceId = null;

                // If we have a preselection, trigger selection
                if (hasPreselection) {
                    this.onTab2SliceSelected();
                }
                return;
            }
        }

        // Otherwise, show all slices from all categories
        categoryLabel.textContent = '';
        DataModel.categories.forEach(category => {
            if (category.items.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = category.name;

                category.items.forEach(item => {
                    const option = document.createElement('option');
                    option.value = `${category.id}|${item.id}`;
                    option.textContent = item.name;
                    optgroup.appendChild(option);
                });

                select.appendChild(optgroup);
            }
        });
    },

    onTab2SliceSelected() {
        const select = document.getElementById('tab2-slice-select');
        const spokesSection = document.getElementById('spokes-section');
        const spokesList = document.getElementById('tab2-spokes-list');

        if (!select.value) {
            spokesSection.style.opacity = '0.5';
            spokesSection.style.pointerEvents = 'none';
            spokesList.innerHTML = '<div class="tab2-spokes-empty">Select a slice to manage spokes</div>';
            return;
        }

        spokesSection.style.opacity = '1';
        spokesSection.style.pointerEvents = 'auto';

        // Reset expanded states when switching slices
        this.expandedSpokeActions = {};

        this.renderTab2Spokes();
    },

    getTab2SelectedSlice() {
        const select = document.getElementById('tab2-slice-select');
        if (!select.value) return null;

        const [categoryId, itemId] = select.value.split('|');
        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return null;

        const item = category.items.find(i => i.id === itemId);
        if (!item) return null;

        return { category, item, categoryId, itemId };
    },

    // Track which spokes have expanded action lists
    expandedSpokeActions: {},

    renderTab2Spokes() {
        const container = document.getElementById('tab2-spokes-list');
        const data = this.getTab2SelectedSlice();

        if (!data) {
            container.innerHTML = '<div class="tab2-spokes-empty">Select a slice to manage spokes</div>';
            return;
        }

        const { item, categoryId, itemId } = data;

        if (item.subItems.length === 0) {
            container.innerHTML = '<div class="tab2-spokes-empty">No spokes yet. Add one below.</div>';
            return;
        }

        container.innerHTML = '';

        item.subItems.forEach((spoke, idx) => {
            const spokeText = typeof spoke === 'string' ? spoke : spoke.text;
            const spokeType = DataModel.getSpokeType(categoryId, itemId, idx);
            const children = typeof spoke === 'object' ? spoke.children || [] : [];
            const hasChildScheduled = children.some(c => c.scheduled && c.scheduled.date);
            const isExpanded = this.expandedSpokeActions[idx];

            // Get spoke-level schedule for single/repeating types
            const spokeSchedule = typeof spoke === 'object' ? spoke.scheduled : null;
            const spokeRecurrence = typeof spoke === 'object' && spoke.metadata ? spoke.metadata.recurrence : null;

            const wrapper = document.createElement('div');
            wrapper.className = 'tab2-spoke-wrapper';
            wrapper.style.cssText = 'display:flex;align-items:start;gap:4px;';

            const spokeStar = document.createElement('button');
            spokeStar.className = `priority-star-btn ${this.isPrioritised({type:'spoke', categoryId, itemId, spokeIndex:idx}) ? 'active' : ''}`;
            spokeStar.innerHTML = '&#9733;';
            spokeStar.title = 'Add to priorities';
            spokeStar.style.cssText = 'flex-shrink:0;margin-top:8px;';
            spokeStar.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addToPriorities({type:'spoke', categoryId, itemId, spokeIndex:idx});
                spokeStar.classList.toggle('active', this.isPrioritised({type:'spoke', categoryId, itemId, spokeIndex:idx}));
            });
            wrapper.appendChild(spokeStar);

            const div = document.createElement('div');
            div.className = 'tab2-spoke-item';
            div.style.flex = '1';

            // Build the spoke type button based on current type and schedule state
            let spokeTypeButton = '';
            if (spokeType === 'single') {
                if (spokeSchedule && spokeSchedule.date) {
                    const schedDate = new Date(`${spokeSchedule.date}T${spokeSchedule.time || '00:00'}`);
                    const timeStr = spokeSchedule.time ? schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    const borderStyle = UI.getScheduleBorderStyle(spokeSchedule.date, spokeSchedule.time);
                    // base colour as fallback; getScheduleBorderStyle overrides it for past/today/tomorrow.
                    spokeTypeButton = `<button style="background: var(--sched-color-base); ${borderStyle}" onclick="UI.showSpokeEditor('${categoryId}', '${itemId}', ${idx})" title="Reschedule">${dateStr}${timeStr ? ' ' + timeStr : ''}</button>`;
                } else {
                    // No date set — use list colour to signal "needs scheduling".
                    spokeTypeButton = `<button style="background: var(--sched-color-list);" onclick="UI.showSpokeEditor('${categoryId}', '${itemId}', ${idx})" title="Schedule">📅 Schedule</button>`;
                }
            } else if (spokeType === 'repeating') {
                if (spokeRecurrence) {
                    const recurrenceText = this.formatRecurrenceDescriptionCompact(spokeRecurrence);
                    const recBorder = UI.getScheduleBorderStyle(ChartRenderer.getNextOccurrence(spokeRecurrence) || spokeRecurrence.startDate, spokeRecurrence.time);
                    // base colour as fallback; getScheduleBorderStyle overrides it for past/today/tomorrow.
                    spokeTypeButton = `<button style="background: var(--sched-color-base); ${recBorder}" onclick="UI.showSpokeEditor('${categoryId}', '${itemId}', ${idx})" title="Edit recurrence">${recurrenceText}</button>`;
                } else {
                    // No recurrence set — use list colour to signal "needs configuration".
                    spokeTypeButton = `<button style="background: var(--sched-color-list);" onclick="UI.showSpokeEditor('${categoryId}', '${itemId}', ${idx})" title="Set recurrence">↻ Set recurrence</button>`;
                }
            } else if (spokeType === 'list') {
                spokeTypeButton = `<button style="background:#4CAF50;" onclick="UI.showAddActionInput('${categoryId}', '${itemId}', ${idx})" title="Add action">+</button><button class="secondary" onclick="UI.showSpokeEditor('${categoryId}', '${itemId}', ${idx})" title="Manage actions"><img width="17" height="17" src="./assets/gear.svg"></button>`;
            } else {
                // static - show type picker button
                spokeTypeButton = `<button class="secondary" onclick="UI.showSpokeEditor('${categoryId}', '${itemId}', ${idx})" title="Change spoke type"><img width="17" height="17" src="./assets/gear.svg"></button>`;
            }

            div.innerHTML = `
                <span class="spoke-name">${spokeText}</span>
                ${children.length > 0 ? `<span class="spoke-actions-count clickable" onclick="UI.toggleSpokeActions(${idx})" title="Click to ${isExpanded ? 'collapse' : 'expand'}">${isExpanded ? '▼' : '▶'} (${children.length} action${children.length > 1 ? 's' : ''})</span>` : ''}
                ${hasChildScheduled ? '<span class="spoke-scheduled">Scheduled</span>' : ''}
                ${spokeTypeButton}
                <button class="warn" onclick="UI.removeSpokeFromTab2(${idx})" title="Remove spoke">×</button>
            `;
            wrapper.appendChild(div);

            // Render expanded action list if open
            if (isExpanded && children.length > 0) {
                const actionsList = document.createElement('div');
                actionsList.className = 'tab2-actions-expanded';
                actionsList.innerHTML = children.map((child, childIdx) => {
                    const childText = typeof child === 'string' ? child : child.text;
                    const hasSchedule = child.scheduled && child.scheduled.date && (child.scheduled.time || child.scheduled.allDay);
                    let scheduleDisplay = '';
                    if (hasSchedule) {
                        const actionBorder = UI.getScheduleBorderStyle(child.scheduled.date, child.scheduled.time);
                        if (child.scheduled.allDay) {
                            const dateStr = new Date(child.scheduled.date + 'T00:00').toLocaleDateString([], { month: 'short', day: 'numeric' });
                            scheduleDisplay = `<span class="action-schedule" style="${actionBorder}">${dateStr} (all day)</span>`;
                        } else {
                            const schedDate = new Date(`${child.scheduled.date}T${child.scheduled.time}`);
                            const timeStr = schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                            scheduleDisplay = `<span class="action-schedule" style="${actionBorder}">${dateStr} ${timeStr}</span>`;
                        }
                    }
                    const isCompleted = child.completed || false;
                    const isActionPrioritised = UI.isPrioritised({type:'action', categoryId, itemId, spokeIndex:idx, childIndex:childIdx});
                    return `
                        <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;">
                            <button class="priority-star-btn ${isActionPrioritised ? 'active' : ''}"
                                onclick="event.stopPropagation(); UI.addToPriorities({type:'action', categoryId:'${categoryId}', itemId:'${itemId}', spokeIndex:${idx}, childIndex:${childIdx}}); this.classList.toggle('active', UI.isPrioritised({type:'action', categoryId:'${categoryId}', itemId:'${itemId}', spokeIndex:${idx}, childIndex:${childIdx}}))"
                                title="Add to priorities" style="flex-shrink:0;">&#9733;</button>
                            <div class="tab2-action-item" style="flex:1;margin-bottom:0;">
                                <input type="checkbox" class="action-checkbox"
                                    onchange="UI.toggleActionCompleted('${categoryId}', '${itemId}', ${idx}, ${childIdx})"
                                    ${isCompleted ? 'checked' : ''}>
                                <span class="action-text ${isCompleted ? 'action-completed' : ''}">${UI.linkifyUrls(childText)}</span>
                                ${scheduleDisplay}
                                <button class="small warn" onclick="UI.removeActionFromTab2(${idx}, ${childIdx})" title="Remove action">×</button>
                            </div>
                        </div>
                    `;
                }).join('');
                wrapper.appendChild(actionsList);
            }

            container.appendChild(wrapper);
        });
    },

    toggleSpokeActions(spokeIndex) {
        this.expandedSpokeActions[spokeIndex] = !this.expandedSpokeActions[spokeIndex];
        this.renderTab2Spokes();
    },

    removeActionFromTab2(spokeIndex, actionIndex) {
        const data = this.getTab2SelectedSlice();
        if (!data) return;

        const { categoryId, itemId } = data;
        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item || !item.subItems[spokeIndex]) return;

        const spoke = item.subItems[spokeIndex];
        if (typeof spoke !== 'object' || !spoke.children) return;

        spoke.children.splice(actionIndex, 1);
        DataModel.saveToStorage();

        this.renderTab2Spokes();
        App.render();
    },

    addSpokeFromTab2() {
        const data = this.getTab2SelectedSlice();
        if (!data) {
            alert('Please select a slice first');
            return;
        }

        const input = document.getElementById('tab2-new-spoke');
        const spokeText = input.value.trim();

        if (!spokeText) {
            alert('Please enter a spoke name');
            return;
        }

        const { categoryId, itemId } = data;
        DataModel.addSubItem(categoryId, itemId, spokeText);

        input.value = '';
        this.renderTab2Spokes();
        App.render();

        // Notify tutorial
        if (typeof TutorialManager !== 'undefined') {
            TutorialManager.notifyEvent('spoke-added');
        }
    },

    removeSpokeFromTab2(spokeIndex) {
        if (!confirm('Remove this spoke and all its actions?')) return;

        const data = this.getTab2SelectedSlice();
        if (!data) return;

        const { categoryId, itemId } = data;
        DataModel.removeSubItem(categoryId, itemId, spokeIndex);

        this.renderTab2Spokes();
        App.render();
    },

    openSpokeConfigFromTab2(spokeIndex) {
        const data = this.getTab2SelectedSlice();
        if (!data) return;

        const { category, item, categoryId, itemId } = data;
        const spoke = item.subItems[spokeIndex];
        const spokeName = typeof spoke === 'string' ? spoke : spoke.text;

        this.showSpokeEditor(categoryId, itemId, spokeIndex);
    },
    
    closeMenuIfOutside(event) {
        if (event.target.id === 'menu-overlay') {
            this.closeMenu();
        }
    },

    showSettings() {
        document.getElementById('settings-overlay').classList.add('active');
        this.loadCalendarProvider();
        this.loadCalendarSyncState();
        this.loadCloudSyncState();
        this.updateCalendarImportButton();
        // Sync colour-scheme radio to saved preference
        const pref = localStorage.getItem('brainpie-color-scheme') || 'auto';
        const radio = document.querySelector(`input[name="color-scheme"][value="${pref}"]`);
        if (radio) radio.checked = true;
    },
    
    closeSettings() {
        document.getElementById('settings-overlay').classList.remove('active');
    },
    
    saveCalendarProvider(provider) {
        localStorage.setItem('calendarProvider', provider);
    },
    
    loadCalendarProvider() {
        const provider = localStorage.getItem('calendarProvider') || 'google';
        const radio = document.querySelector(`input[name="calendar-provider"][value="${provider}"]`);
        if (radio) {
            radio.checked = true;
        }
    },
    
    getCalendarProvider() {
        return localStorage.getItem('calendarProvider') || 'google';
    },

    // ==========================================
    // Calendar Sync (Standalone Google Sign-In)
    // ==========================================

    /**
     * Load calendar sync state when Settings opened
     */
    loadCalendarSyncState() {
        const section = document.getElementById('calendar-sync-section');
        if (!section) return;

        // Hide if Firebase cloud sync is active (Firebase handles calendar auth)
        if (typeof StorageAdapter !== 'undefined' && StorageAdapter.isFirebaseMode()) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        this.updateCalendarSyncUI();
    },

    /**
     * Update calendar sync UI based on sign-in state
     */
    updateCalendarSyncUI() {
        const signedOutEl = document.getElementById('calendar-sync-signed-out');
        const signedInEl = document.getElementById('calendar-sync-signed-in');

        if (typeof GoogleAuthAdapter !== 'undefined' && GoogleAuthAdapter.isSignedIn()) {
            signedOutEl.style.display = 'none';
            signedInEl.style.display = 'block';

            const photoEl = document.getElementById('calendar-user-photo');
            const nameEl = document.getElementById('calendar-user-name');

            if (GoogleAuthAdapter.userInfo) {
                if (photoEl) photoEl.src = GoogleAuthAdapter.userInfo.picture || '';
                if (nameEl) nameEl.textContent = GoogleAuthAdapter.userInfo.name || GoogleAuthAdapter.userInfo.email;
            }
        } else {
            signedOutEl.style.display = 'block';
            signedInEl.style.display = 'none';
        }
    },

    /**
     * Sign in with Google for Calendar access only
     */
    async signInForCalendar() {
        try {
            if (typeof GoogleAuthAdapter === 'undefined') {
                alert('Google Auth not available');
                return;
            }

            await GoogleAuthAdapter.init();
            await GoogleAuthAdapter.signIn();

            this.updateCalendarSyncUI();
            this.updateCalendarImportButton();
            Storage.showStatus('Calendar sync enabled', 'success');

            // Sync calendar events
            if (typeof App !== 'undefined' && App.syncCalendarEvents) {
                App.syncCalendarEvents();
            }
        } catch (e) {
            console.error('Calendar sign-in error:', e);
            alert('Sign in failed: ' + e.message);
        }
    },

    /**
     * Sign out of Calendar-only Google auth
     */
    signOutCalendar() {
        if (typeof GoogleAuthAdapter !== 'undefined') {
            GoogleAuthAdapter.signOut();
        }
        this.updateCalendarSyncUI();
        this.updateCalendarImportButton();
        Storage.showStatus('Calendar sync disabled', 'success');
    },
    
    // Helper to determine if a color is dark
    isColorDark(hexColor) {
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 170;
    },
    
    renderCategoriesList(categories) {
        const container = document.getElementById('categories-list');

        container.innerHTML = '';

        categories.forEach((category, categoryIndex) => {
            
            // Create category card
            const card = document.createElement('div');
            card.className = 'category-card';
            card.style.borderLeftColor = category.color;
            card.dataset.categoryId = category.id;
            card.dataset.categoryIndex = categoryIndex;
            // Only allow drag from the grip handle, not inputs/editable areas
            card.addEventListener('mousedown', (e) => {
                if (e.target.closest('.category-drag-handle')) {
                    card.draggable = true;
                } else {
                    card.draggable = false;
                }
            });

            // Category drag events
            card.addEventListener('dragstart', this.handleCategoryDragStart.bind(this));
            card.addEventListener('dragend', this.handleDragEnd.bind(this));
            card.addEventListener('dragover', this.handleCategoryDragOver.bind(this));
            card.addEventListener('drop', this.handleCategoryDrop.bind(this));
            
            // Item drop zone
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (this.draggedData && this.draggedData.type === 'item') {
                    card.style.background = 'var(--color-tint-green)';
                }
            });
            
            card.addEventListener('dragleave', () => {
                if (this.draggedData && this.draggedData.type === 'item') {
                    card.style.background = '';
                }
            });
            
            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.style.background = '';
                
                if (this.draggedData && this.draggedData.type === 'item') {
                    const fromCategoryId = this.draggedData.categoryId;
                    const itemId = this.draggedData.itemId;
                    const toCategoryId = category.id;
                    
                    if (fromCategoryId !== toCategoryId) {
                        App.moveItem(fromCategoryId, itemId, toCategoryId);
                    }
                }
            });
            
            // Get the actual percentage (from overrides or auto-calculated)
            const displayPercentage = DataModel.getCategoryPercentage(category.id).toFixed(1);
            
            const itemsHTML = category.items.length > 0
                ? `<div class="items-in-category">
                    ${category.items.map(item => `
                        <div class="item-card"
                             style="border-left-color: ${item.color}"
                             data-category-id="${category.id}"
                             data-item-id="${item.id}"
                             onmousedown="var h=event.target.closest('.item-drag-handle'); this.draggable=!!h;"
                             ondragstart="UI.handleItemDragStart(event)"
                             ondragend="UI.handleDragEnd(event)"
                             ondragover="UI.handleItemDragOver(event)"
                            ondrop="UI.handleItemDrop(event)"
                             >
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 0px;">
                                <span class="item-drag-handle" style="font-size: 16px; color: var(--color-text-muted); cursor: move; padding: 2px 4px; margin-top: 2px;">⋮⋮</span>
                                <button class="priority-star-btn ${UI.isPrioritised({type:'slice', categoryId:category.id, itemId:item.id}) ? 'active' : ''}"
                                    onclick="event.stopPropagation(); UI.addToPriorities({type:'slice', categoryId:'${category.id}', itemId:'${item.id}'})"
                                    title="Add to priorities" style="flex-shrink:0;margin-top:-4px;">&#9733;</button>
                                <div>
                                    <h3 contenteditable="true"
                                        onblur="App.updateItemName('${category.id}', '${item.id}', this.textContent)"
                                        style="flex: 1; outline: none; padding: 2px; border-radius: 3px;"
                                        onfocus="this.style.background='var(--color-hover)'"
                                        onblur="this.style.background='transparent'"
                                    >${item.name}</h3>
                                    <div class="item-percentage" style="display: flex; align-items: center; gap: 8px;">
                                        <input type="number" 
                                            name="categoryPercentage"
                                            value="${item.percentage.toFixed(1)}" 
                                            min="0" 
                                            max="100" 
                                            step="0.1"
                                            style="width: 47px; padding: 0 4px 4px 0; border: 1px solid var(--color-border-subtle); border-radius: 4px;padding-inline: 1px"
                                            onchange="App.updateItemPercentage('${category.id}', '${item.id}', parseFloat(this.value))">
                                        <span>%</span>
                                    </div>
                                </div>
                                <input type="color"
                                       value="${item.color}"
                                       title="Change color"
                                       style="width: 50px; height: 50px; border: 2px solid var(--color-border-subtle); border-radius: 4px; cursor: pointer;"
                                       onchange="App.updateItemColor('${category.id}', '${item.id}', this.value)">
                                <button style="background: #4CAF50; margin-left: 5px;" onclick="UI.showAddSpokeInput('${category.id}', '${item.id}')" title="Add spoke">+ <span class="btn-label">Spoke</span></button>
                                <button class="warn" style="margin-left: 5px;" onclick="App.removeItem('${category.id}', '${item.id}')">
                                    <img width="15" height="15" src="./assets/trash.svg" />
                                </button>
                            </div>
                            ${item.subItems && item.subItems.length > 0
                                ? `<ul
                                    class="spoke-list"
                                    style="position: relative;">${item.subItems.map((sub, idx) => {
                                    const spokeIndex = (typeof sub === 'object' && sub._originalIndex != null) ? sub._originalIndex : idx;
                                    const subText = typeof sub === 'string' ? sub : sub.text;
                                    const spokeType = DataModel.getSpokeType(category.id, item.id, spokeIndex);
                                    const children = typeof sub === 'object' ? sub.children || [] : [];
                                    const spokeSchedule = typeof sub === 'object' ? sub.scheduled : null;
                                    const spokeRecurrence = typeof sub === 'object' && sub.metadata ? sub.metadata.recurrence : null;

                                    // Build spoke type button based on type
                                    let spokeTypeBtn = '';
                                    if (spokeType === 'single') {
                                        if (spokeSchedule && spokeSchedule.date) {
                                            const schedDate = new Date(spokeSchedule.date + 'T' + (spokeSchedule.time || '00:00'));
                                            const timeStr = spokeSchedule.time ? schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                                            const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                            const borderStyle = UI.getScheduleBorderStyle(spokeSchedule.date, spokeSchedule.time);
                                            // base colour as fallback; getScheduleBorderStyle overrides for past/today/tomorrow.
                                            spokeTypeBtn = `<button class="small" style="background: var(--sched-color-base); padding: 3px 17px; ${borderStyle}" onclick="UI.showSpokeEditor('${category.id}', '${item.id}', ${spokeIndex})" title="Reschedule">${dateStr}${timeStr ? ' ' + timeStr : ''}</button>`;
                                        } else {
                                            // No date set — list colour signals "needs scheduling".
                                            spokeTypeBtn = `<button class="small" style="background: var(--sched-color-list); padding: 3px 17px;" onclick="UI.showSpokeEditor('${category.id}', '${item.id}', ${spokeIndex})" title="Schedule">📅</button>`;
                                        }
                                    } else if (spokeType === 'repeating') {
                                        if (spokeRecurrence) {
                                            const recBorder = UI.getScheduleBorderStyle(ChartRenderer.getNextOccurrence(spokeRecurrence) || spokeRecurrence.startDate, spokeRecurrence.time);
                                            // base colour as fallback; getScheduleBorderStyle overrides for past/today/tomorrow.
                                            spokeTypeBtn = `<button class="small" style="background: var(--sched-color-base); padding: 3px 17px; ${recBorder}" onclick="UI.showSpokeEditor('${category.id}', '${item.id}', ${spokeIndex})" title="Edit recurrence">${UI.formatRecurrenceDescriptionCompact(spokeRecurrence)}</button>`;
                                        } else {
                                            // No recurrence set — list colour signals "needs configuration".
                                            spokeTypeBtn = `<button class="small" style="background: var(--sched-color-list); padding: 3px 17px;" onclick="UI.showSpokeEditor('${category.id}', '${item.id}', ${spokeIndex})" title="Set recurrence">↻</button>`;
                                        }
                                    } else if (spokeType === 'list') {
                                        spokeTypeBtn = `<button style="background:#4CAF50;" onclick="UI.showAddActionInput('${category.id}', '${item.id}', ${spokeIndex})" title="Add action">+</button><button class="secondary" onclick="UI.showSpokeEditor('${category.id}', '${item.id}', ${spokeIndex})" title="Manage actions"><img width="17" height="17" src="./assets/gear.svg"></button>`;
                                    } else {
                                        // static - show type picker
                                        spokeTypeBtn = `<button class="secondary" onclick="UI.showSpokeEditor('${category.id}', '${item.id}', ${spokeIndex})" title="Change spoke type"><img width="17" height="17" src="./assets/gear.svg"></button>`;
                                    }

                                    return `
                                    <li draggable="true"
                                        data-category-id="${category.id}"
                                        data-item-id="${item.id}"
                                        data-subitem-index="${spokeIndex}"
                                        ondragstart="UI.handleSubItemDragStart(event)"
                                        ondragend="UI.handleDragEnd(event)"
                                        ondragover="UI.handleSubItemDragOver(event)"
                                        ondrop="UI.handleSubItemDrop(event)"
                                        style="cursor: move;">
                                        <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px; width: 100%; overflow: hidden;">
                                            <button class="priority-star-btn ${UI.isPrioritised({type:'spoke', categoryId:category.id, itemId:item.id, spokeIndex}) ? 'active' : ''}"
                                                onclick="event.stopPropagation(); UI.addToPriorities({type:'spoke', categoryId:'${category.id}', itemId:'${item.id}', spokeIndex:${spokeIndex}})"
                                                title="Add to priorities" style="flex-shrink:0;">&#9733;</button>
                                            <span class="sub-item-text" contenteditable="true"
                                                style="flex: 1; min-width: 0; word-break: break-word; white-space: normal; padding-right: 4px; outline: none; border-radius: 3px;"
                                                onfocus="this.style.background='var(--color-hover)'"
                                                onblur="this.style.background='transparent'; if(!UI.draggedData) App.renameSpoke('${category.id}', '${item.id}', ${spokeIndex}, this.textContent)"
                                                onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"
                                            >${subText}</span>
                                            <div style="display: flex; gap: 4px;">
                                                ${children.length > 0 ? `<span style="color: #2196F3; font-weight: bold; font-size: 18px;">(${children.length})</span>` : ''}
                                                ${spokeTypeBtn}
                                                <button style="justify-self: flex-end;" class="warn" onclick="App.removeSubItem('${category.id}', '${item.id}', ${spokeIndex})" title="Remove spoke">
                                                    <img width="15" height="15" src="./assets/trash.svg" />
                                                </button>
                                            </div>
                                        </div>
                                        ${(typeof sub === 'object' && sub.notes) ? `<div class="spoke-notes-preview">${sub.notes.replace(/</g, '&lt;')}</div>` : ''}
                                        ${children.length > 0 ? `
                                            <ul class="action-list"
                                            style="margin-left: 20px; font-size: 11px; margin-top: 6px;">
                                                ${children.map((child, childIdx) => {
                                                    const childText = typeof child === 'string' ? child : child.text;
                                                    const hasSchedule = child.scheduled && child.scheduled.date && (child.scheduled.time || child.scheduled.allDay);
                                                    const hasRecurrence = child.recurrence;
                                                    let scheduleDisplay = '📅';
                                                    let buttonStyle = 'background: #4285F4; padding: 3px 12px;';
                                                    let buttonTitle = 'Add to calendar';

                                                    if (hasRecurrence) {
                                                        // Repeating action — base colour fallback; getScheduleBorderStyle overrides for urgency states.
                                                        scheduleDisplay = UI.formatRecurrenceDescriptionCompact(child.recurrence);
                                                        const recBorder = UI.getScheduleBorderStyle(ChartRenderer.getNextOccurrence(child.recurrence) || child.recurrence.startDate, child.recurrence.time);
                                                        buttonStyle = 'background: var(--sched-color-base); padding: 3px 17px; ' + recBorder;
                                                        buttonTitle = 'Repeating event';
                                                    } else if (hasSchedule) {
                                                        if (child.scheduled.allDay) {
                                                            const dateStr = new Date(child.scheduled.date + 'T00:00').toLocaleDateString([], { month: 'short', day: 'numeric' });
                                                            scheduleDisplay = dateStr + ' (all day)';
                                                        } else {
                                                            const schedDate = new Date(child.scheduled.date + 'T' + child.scheduled.time);
                                                            const timeStr = schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                            const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                                            scheduleDisplay = dateStr + ' ' + timeStr;
                                                        }
                                                        // base colour fallback; getScheduleBorderStyle overrides for urgency states.
                                                        const actionBorder = UI.getScheduleBorderStyle(child.scheduled.date, child.scheduled.time);
                                                        buttonStyle = 'background: var(--sched-color-base); padding: 3px 17px; ' + actionBorder;
                                                        buttonTitle = 'Reschedule';
                                                    }

                                                    const isActionCompleted = child.completed || false;
                                                    return `
                                                    <li style="cursor: default; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                                                        <button class="priority-star-btn ${UI.isPrioritised({type:'action', categoryId:category.id, itemId:item.id, spokeIndex, childIndex:childIdx}) ? 'active' : ''}"
                                                            onclick="event.stopPropagation(); UI.addToPriorities({type:'action', categoryId:'${category.id}', itemId:'${item.id}', spokeIndex:${spokeIndex}, childIndex:${childIdx}})"
                                                            title="Add to priorities" style="flex-shrink:0;">&#9733;</button>
                                                        <div class="action-container">
                                                            <input type="checkbox" class="action-checkbox"
                                                                onchange="UI.toggleActionCompleted('${category.id}', '${item.id}', ${spokeIndex}, ${childIdx})"
                                                                ${isActionCompleted ? 'checked' : ''}>
                                                            <span style="flex: 1;margin-right: 6px;" class="${isActionCompleted ? 'action-completed' : ''}">${UI.linkifyUrls(childText)}</span>
                                                            <div style="display: flex; gap: 4px;">
                                                                ${!isActionCompleted ? `<button class="small"
                                                                        style="${buttonStyle}"
                                                                        onclick="UI.openCalendarForActionWithLocation('${encodeURIComponent(childText)}', '${encodeURIComponent(subText)}', '${item.name}', '${encodeURIComponent(category.name)}', '${category.id}', '${item.id}', ${spokeIndex}, ${childIdx})"
                                                                        title="${buttonTitle}">${scheduleDisplay}</button>` : ''}
                                                                <button class="small warn" onclick="App.removeSpokeChild('${category.id}', '${item.id}', ${spokeIndex}, ${childIdx})" title="Remove action">
                                                                    <img width="15" height="20" src="./assets/trash.svg" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </li>
                                                `}).join('')}
                                            </ul>
                                        ` : ''}
                                        <div id="add-action-${category.id}-${item.id}-${spokeIndex}" style="display: none; margin-top: 6px; margin-left: 20px;">
                                            <div style="display: flex; gap: 6px; align-items: center;">
                                                <input type="text"
                                                       id="action-input-${category.id}-${item.id}-${spokeIndex}"
                                                       placeholder="Action name..."
                                                       style="flex: 1; padding: 6px; border: 1px solid #2196F3; border-radius: 4px;"
                                                       onkeydown="if(event.key==='Enter') UI.submitAddAction('${category.id}', '${item.id}', ${spokeIndex})">
                                                <button class="small secondary" onclick="UI.submitAddAction('${category.id}', '${item.id}', ${spokeIndex})">Add</button>
                                                <button class="small warn" onclick="UI.hideAddActionInput('${category.id}', '${item.id}', ${spokeIndex})">
                                                    <img width="15" height="20" src="./assets/trash.svg" />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                `}).join('')}</ul>`
                                : ''}
                            <div id="add-spoke-${category.id}-${item.id}" class="add-spoke-input-container"
                                style="margin-top: 10px; display: none; gap: 8px; align-items: center;">
                                <input type="text"
                                       id="new-subitem-${item.id}"
                                       placeholder="New Spoke"
                                       style="flex: 1; padding: 8px; border: 1px solid #4CAF50; border-radius: 4px;"
                                       onkeydown="if(event.key==='Enter') App.addSubItem('${category.id}', '${item.id}')">
                                <button class="small" style="background: #4CAF50;" onclick="App.addSubItem('${category.id}', '${item.id}')">Add</button>
                                <button class="small warn" onclick="UI.hideAddSpokeInput('${category.id}', '${item.id}')">
                                    <img width="15" height="20" src="./assets/trash.svg" />
                                </button>
                            </div>
                        </div>
                    `).join('')}
                   </div>`
                : '<div class="empty-category">No items yet</div>';
            
            card.innerHTML = `
                <div class="category-header">
                    <div style="flex: 1; display: flex; align-items: center; gap: 10px;">
                        <span class="category-drag-handle" style="font-size: 20px; color: var(--color-text-muted); cursor: move; padding: 4px;">⋮⋮</span>
                        <div style="flex: 1;">
                            <h2 contenteditable="true"
                                onblur="App.updateCategoryName('${category.id}', this.textContent)"
                                style="outline: none; padding: 2px; border-radius: 3px; cursor: text;"
                                onfocus="this.style.background='var(--color-hover)'"
                                onblur="this.style.background='transparent'; App.updateCategoryName('${category.id}', this.textContent)"
                            >${category.name}</h2>
                            <div 
                                class="category-percentage-input-container"
                                style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                                <input type="number"
                                        name="categoryPercentage"
                                       value="${displayPercentage}"
                                       min="0"
                                       max="100"
                                       step="0.1"
                                       style="width: 54px; padding: 6px; border: 1px solid var(--color-border-subtle); border-radius: 4px;padding-inline: 1px"
                                       onchange="App.updateCategoryPercentage('${category.id}', parseFloat(this.value))">
                                <span class="auto-percentage">%</span>
                            </div>
                        </div>
                        <input type="color"
                               value="${category.color}"
                               title="Change category color"
                               style="width: 50px; height: 50px; border: 2px solid var(--color-border-subtle); border-radius: 6px; cursor: pointer;"
                               onchange="App.updateCategoryColor('${category.id}', this.value)">
                    </div>
                    <button style="margin-left: 5px;" onclick="UI.showMenuForCategory('${category.id}')">+ <span class="btn-label">Slice</span></button>
                    <button class="warn" style="margin-left: 5px;" onclick="App.removeCategory('${category.id}')">
                        <img width="15" height="15" src="./assets/trash.svg" />
                    </button>
                </div>
                ${itemsHTML}
            `;
            
            container.appendChild(card);
            
            // Add drag event listeners to item cards after they're added to DOM
            card.querySelectorAll('.item-card').forEach(itemCard => {
                itemCard.addEventListener('dragstart', this.handleItemDragStart.bind(this));
                itemCard.addEventListener('dragend', this.handleDragEnd.bind(this));
            });
        });
    },
    
    handleCategoryDragStart(event) {
        const card = event.currentTarget;
        this.draggedElement = card;
        this.draggedData = {
            type: 'category',
            categoryId: card.dataset.categoryId,
            categoryIndex: parseInt(card.dataset.categoryIndex)
        };
        card.style.opacity = '0.5';
    },
    
    handleCategoryDragOver(event) {
        if (this.draggedData && this.draggedData.type === 'category') {
            event.preventDefault();
            const card = event.currentTarget;
            const rect = card.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            if (event.clientY < midpoint) {
                card.style.borderTop = '3px solid #4CAF50';
                card.style.borderBottom = '';
            } else {
                card.style.borderBottom = '3px solid #4CAF50';
                card.style.borderTop = '';
            }
        }
    },
    
    handleCategoryDrop(event) {
        event.preventDefault();
        
        if (this.draggedData && this.draggedData.type === 'category') {
            const targetCard = event.currentTarget;
            const targetIndex = parseInt(targetCard.dataset.categoryIndex);
            const sourceIndex = this.draggedData.categoryIndex;
            
            if (sourceIndex !== targetIndex) {
                const rect = targetCard.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                const insertBefore = event.clientY < midpoint;
                
                App.reorderCategories(sourceIndex, targetIndex, insertBefore);
            }
            
            targetCard.style.borderTop = '';
            targetCard.style.borderBottom = '';
        }
    },
    
    handleItemDragStart(event) {
        const itemCard = event.currentTarget;
        const categoryCard = itemCard.closest('.category-card');
        const itemIndex = Array.from(categoryCard.querySelectorAll('.item-card')).indexOf(itemCard);
        
        this.draggedElement = itemCard;
        this.draggedData = {
            type: 'item',
            categoryId: itemCard.dataset.categoryId,
            itemId: itemCard.dataset.itemId,
            itemIndex: itemIndex
        };
        itemCard.style.opacity = '0.5';
        event.stopPropagation();
    },

    handleItemDragOver(event) {
        if (this.draggedData && this.draggedData.type === 'item') {
            event.preventDefault();
            const card = event.currentTarget;
            const rect = card.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            if (event.clientY < midpoint) {
                card.style.borderTop = '3px solid #2196F3';
                card.style.borderBottom = '';
            } else {
                card.style.borderBottom = '3px solid #2196F3';
                card.style.borderTop = '';
            }
        }
    },
    
    handleItemDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        
        if (this.draggedData && this.draggedData.type === 'item') {
            const targetCard = event.currentTarget;
            const targetCategoryId = targetCard.dataset.categoryId;
            const sourceCategoryId = this.draggedData.categoryId;
            const sourceItemId = this.draggedData.itemId;
            
            const categoryCard = targetCard.closest('.category-card');
            const allItemCards = Array.from(categoryCard.querySelectorAll('.item-card'));
            const targetIndex = allItemCards.indexOf(targetCard);
            
            if (sourceCategoryId === targetCategoryId) {
                // Reordering within same category
                const sourceIndex = this.draggedData.itemIndex;
                if (sourceIndex !== targetIndex) {
                    const rect = targetCard.getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;
                    const insertAfter = event.clientY >= midpoint;
                    const finalIndex = insertAfter ? targetIndex : targetIndex;
                    
                    App.reorderItems(sourceCategoryId, sourceIndex, finalIndex);
                }
            } else {
                // Moving between categories
                App.moveItem(sourceCategoryId, sourceItemId, targetCategoryId);
            }
            
            targetCard.style.borderTop = '';
            targetCard.style.borderBottom = '';
        }
    },
    
    handleSubItemDragStart(event) {
        const li = event.currentTarget;
        this.draggedElement = li;
        this.draggedData = {
            type: 'subitem',
            categoryId: li.dataset.categoryId,
            itemId: li.dataset.itemId,
            subItemIndex: parseInt(li.dataset.subitemIndex)
        };
        li.style.opacity = '0.5';
        event.stopPropagation();
    },
    
    handleSubItemDragOver(event) {
        event.preventDefault();
        const li = event.currentTarget;
        if (this.draggedData && this.draggedData.type === 'subitem') {
            li.style.borderTop = '2px solid #4CAF50';
        }
    },
    
    handleSubItemDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const targetLi = event.currentTarget;
        targetLi.style.borderTop = '';
        
        if (this.draggedData && this.draggedData.type === 'subitem') {
            const fromCategoryId = this.draggedData.categoryId;
            const fromItemId = this.draggedData.itemId;
            const fromIndex = this.draggedData.subItemIndex;
            
            const toCategoryId = targetLi.dataset.categoryId;
            const toItemId = targetLi.dataset.itemId;
            const toIndex = parseInt(targetLi.dataset.subitemIndex);
            
            App.moveSubItem(fromCategoryId, fromItemId, fromIndex, toCategoryId, toItemId, toIndex);
        }
    },
    
    handleDragEnd() {
        if (this.draggedElement) {
            this.draggedElement.style.opacity = '';
        }
        this.draggedElement = null;
        this.draggedData = null;
        
        // Clean up any visual indicators
        document.querySelectorAll('.category-card').forEach(card => {
            card.style.background = '';
            card.style.borderTop = '';
            card.style.borderBottom = '';
        });
        document.querySelectorAll('.item-card').forEach(card => {
            card.style.borderTop = '';
            card.style.borderBottom = '';
        });
        document.querySelectorAll('li').forEach(li => {
            li.style.borderTop = '';
        });
    },

    showAddSpokeInput(categoryId, itemId) {
        this.hideAllAddSpokeInputs();
        const inputDiv = document.getElementById(`add-spoke-${categoryId}-${itemId}`);
        const input = document.getElementById(`new-subitem-${itemId}`);
        if (inputDiv && input) {
            inputDiv.style.display = 'flex';
            input.focus();
        }
    },

    hideAddSpokeInput(categoryId, itemId) {
        const inputDiv = document.getElementById(`add-spoke-${categoryId}-${itemId}`);
        const input = document.getElementById(`new-subitem-${itemId}`);
        if (inputDiv) inputDiv.style.display = 'none';
        if (input) input.value = '';
    },

    hideAllAddSpokeInputs() {
        document.querySelectorAll('[id^="add-spoke-"]').forEach(div => {
            div.style.display = 'none';
            const input = div.querySelector('input[type="text"]');
            if (input) input.value = '';
        });
    },

    showAddActionInput(categoryId, itemId, spokeIndex) {
        this.hideAllAddActionInputs();
        const inputDiv = document.getElementById(`add-action-${categoryId}-${itemId}-${spokeIndex}`);
        const input = document.getElementById(`action-input-${categoryId}-${itemId}-${spokeIndex}`);
        
        if (inputDiv && input) {
            inputDiv.style.display = 'block';
            input.focus();
        }
    },

    hideAllAddActionInputs() {
        const inputDivs = document.querySelectorAll('[id^="add-action-"]');

        inputDivs.forEach(inputDiv => {
            // Derive the matching input id from the div id
            const inputId = inputDiv.id.replace('add-action', 'action-input');
            const input = document.getElementById(inputId);

            if (input) {
                inputDiv.style.display = 'none';
                input.value = '';
            }
        });
    },

    hideAddActionInput(categoryId, itemId, spokeIndex) {
        const inputDiv = document.getElementById(`add-action-${categoryId}-${itemId}-${spokeIndex}`);
        const input = document.getElementById(`action-input-${categoryId}-${itemId}-${spokeIndex}`);

        if (inputDiv) {
            inputDiv.style.display = 'none';
        }
        if (input) {
            input.value = '';
        }
    },
    
    submitAddAction(categoryId, itemId, spokeIndex) {
        const input = document.getElementById(`action-input-${categoryId}-${itemId}-${spokeIndex}`);
        const text = input.value.trim();

        if (text) {
            // Store pending action details and show type picker
            this.pendingActionAdd = {
                categoryId,
                itemId,
                spokeIndex,
                actionName: text
            };
            this.showActionTypePicker(text);
            this.hideAllAddActionInputs();
        }
    },

    // Action Type Picker
    pendingActionAdd: null,

    showActionTypePicker(actionName) {
        document.getElementById('action-type-action-name').textContent = actionName;
        document.getElementById('action-type-overlay').classList.add('active');
    },

    closeActionTypePicker() {
        document.getElementById('action-type-overlay').classList.remove('active');
        this.pendingActionAdd = null;
    },

    selectActionType(type) {
        if (!this.pendingActionAdd) return;

        const { categoryId, itemId, spokeIndex, actionName } = this.pendingActionAdd;

        // Get spoke and slice info for calendar
        const category = DataModel.categories.find(c => c.id === categoryId);
        const item = category ? category.items.find(i => i.id === itemId) : null;
        const spoke = item ? item.subItems[spokeIndex] : null;
        const spokeText = spoke ? (typeof spoke === 'string' ? spoke : spoke.text) : '';

        if (type === 'static') {
            // Just add the action, no calendar
            App.addSpokeChild(categoryId, itemId, spokeIndex, actionName);
            this.closeActionTypePicker();
        } else if (type === 'onetime') {
            // Add action then show date/time picker
            App.addSpokeChild(categoryId, itemId, spokeIndex, actionName);
            this.closeActionTypePicker();

            // Get the index of the newly added action
            const updatedSpoke = DataModel.categories
                .find(c => c.id === categoryId)?.items
                .find(i => i.id === itemId)?.subItems[spokeIndex];
            const childIndex = updatedSpoke?.children ? updatedSpoke.children.length - 1 : 0;

            // Show date picker
            const dataLocation = { categoryId, itemId, spokeIndex, childIndex };
            this.showDateTimePicker(actionName, spokeText, item?.name || '', category?.name || '', dataLocation);

            // Notify tutorial
            if (typeof TutorialManager !== 'undefined') {
                TutorialManager.notifyEvent('action-scheduled');
            }
        } else if (type === 'repeating') {
            // Show recurrence picker, then add with recurrence
            this.closeActionTypePicker();
            this.showRecurrencePicker(async (recurrence) => {
                // Add action with recurrence metadata
                App.addSpokeChild(categoryId, itemId, spokeIndex, actionName);

                // Get the newly added action and set its recurrence
                const updatedCategory = DataModel.categories.find(c => c.id === categoryId);
                const updatedItem = updatedCategory?.items.find(i => i.id === itemId);
                const updatedSpoke = updatedItem?.subItems[spokeIndex];

                if (updatedSpoke && typeof updatedSpoke === 'object' && updatedSpoke.children) {
                    const childIndex = updatedSpoke.children.length - 1;
                    const action = updatedSpoke.children[childIndex];

                    if (action) {
                        // Store recurrence in action
                        action.recurrence = recurrence;

                        // Create calendar event if available
                        if (typeof CalendarAdapter !== 'undefined' && CalendarAdapter.isAvailable()) {
                            const rrule = CalendarAdapter.buildRRule(recurrence);
                            const eventData = {
                                title: `${actionName} (${spokeText}/${item?.name}/${category?.name})`,
                                date: recurrence.startDate,
                                description: `Repeating action: ${actionName}\nSpoke: ${spokeText}\nSlice: ${item?.name}\nCategory: ${category?.name}\nCreated from Brain Pie`,
                                rrule: rrule
                            };

                            if (recurrence.allDay) {
                                eventData.allDay = true;
                            } else {
                                eventData.time = recurrence.time || '09:00';
                                eventData.duration = recurrence.duration || 60;
                            }

                            const event = await CalendarAdapter.createEvent(eventData);
                            if (event && event.id) {
                                action.calendarEventId = event.id;
                                Storage.showStatus('Recurring event added to calendar', 'success');
                            }
                        }

                        DataModel.saveToStorage();
                        App.render();
                    }
                }
            });
        }
    },

    clearInputs() {
        document.getElementById('item-name').value = '';
        document.getElementById('item-percentage').value = '';
        document.getElementById('item-category').value = '';
        document.getElementById('item-color').value = this.getRandomColor();
    },
    
    clearCategoryInputs() {
        document.getElementById('new-category-name').value = '';
        document.getElementById('new-category-color').value = this.getRandomColor();
    },
    
    getRandomColor() {
        const palette = SWATCH_PALETTES[this._swatchActiveTab] || SWATCH_PALETTE;
        return palette[Math.floor(Math.random() * palette.length)];
    },

    openSwatchPicker(inputId) {
        this._swatchTargetId = inputId;
        this._populateSwatchGrid(SWATCH_PALETTES[this._swatchActiveTab] || SWATCH_PALETTE);
        document.getElementById('swatch-picker-overlay').classList.add('active');
    },

    _populateSwatchGrid(palette) {
        const grid = document.getElementById('swatch-grid');
        grid.innerHTML = '';
        palette.forEach(hex => {
            const el = document.createElement('button');
            el.className = 'swatch-item';
            el.style.background = hex;
            el.title = hex;
            el.setAttribute('type', 'button');
            el.onclick = () => this._applySwatchColor(hex);
            grid.appendChild(el);
        });
    },

    _switchSwatchTab(tab) {
        this._swatchActiveTab = tab;
        document.querySelectorAll('.swatch-tab').forEach(btn => btn.classList.remove('active'));
        const tabEl = document.getElementById('swatch-tab-' + tab);
        if (tabEl) tabEl.classList.add('active');
        this._populateSwatchGrid(SWATCH_PALETTES[tab] || SWATCH_PALETTE);
    },

    closeSwatchPicker() {
        document.getElementById('swatch-picker-overlay').classList.remove('active');
    },

    _applySwatchColor(hex) {
        const input = document.getElementById(this._swatchTargetId);
        if (input) {
            input.value = hex;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        this.closeSwatchPicker();
    },

    showDisclaimer() {
        document.getElementById('disclaimer-overlay').classList.add('active');
    },

    closeDisclaimer() {
        document.getElementById('disclaimer-overlay').classList.remove('active');
    },

    showPrivacy() {
        document.getElementById('privacy-overlay').classList.add('active');
    },

    closePrivacy() {
        document.getElementById('privacy-overlay').classList.remove('active');
    },

    // ==========================================
    // Documentation Popup
    // ==========================================

    docsCurrentPage: 1,
    docsTotalPages: 8,

    openDocs() {
        document.getElementById('docs-overlay').classList.add('active');
        this.switchDocsPage(1);
    },

    closeDocs() {
        document.getElementById('docs-overlay').classList.remove('active');
    },

    switchDocsPage(pageNum) {
        this.docsCurrentPage = pageNum;
        document.querySelectorAll('.docs-page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.docs-nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('docs-page-' + pageNum).classList.add('active');
        document.querySelector('.docs-nav-btn[data-page="' + pageNum + '"]').classList.add('active');
        document.querySelector('.docs-prev').style.visibility = pageNum === 1 ? 'hidden' : 'visible';
        document.querySelector('.docs-next').style.visibility = pageNum === this.docsTotalPages ? 'hidden' : 'visible';
        // Scroll page content to top
        document.getElementById('docs-page-' + pageNum).scrollTop = 0;
    },

    docsPagePrev() {
        if (this.docsCurrentPage > 1) this.switchDocsPage(this.docsCurrentPage - 1);
    },

    docsPageNext() {
        if (this.docsCurrentPage < this.docsTotalPages) this.switchDocsPage(this.docsCurrentPage + 1);
    },
    toggleActionCompleted(categoryId, itemId, spokeIndex, childIndex, skipRender = false) {
        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item || !item.subItems[spokeIndex]) return;

        const spoke = item.subItems[spokeIndex];
        if (typeof spoke !== 'object' || !spoke.children || !spoke.children[childIndex]) return;

        const child = spoke.children[childIndex];
        if (typeof child === 'string') {
            spoke.children[childIndex] = { text: child, children: [], completed: true };
        } else {
            child.completed = !child.completed;
        }

        // Remove from priorities when completed
        const nowCompleted = typeof spoke.children[childIndex] === 'object' && spoke.children[childIndex].completed;
        if (nowCompleted) {
            const ref = { type: 'action', categoryId, itemId, spokeIndex, childIndex };
            const prioIdx = this.getPriorityIndex(ref);
            if (prioIdx >= 0) DataModel.removePriority(prioIdx);
        }

        DataModel.saveToStorage();
        if (!skipRender) {
            this.renderTab2Spokes();
            this.renderSpokeEditorActions();
            App.render();
        }
    },
    // --- Multi-pie tab UI ---

    renderPieTabs() {
        const container = document.getElementById('pie-tabs');
        if (!container) return;

        const pies = DataModel.getPieList();

        if (pies.length === 0) {
            container.innerHTML = '';
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        container.innerHTML = '';

        pies.forEach(pie => {
            const btn = document.createElement('button');
            btn.className = 'pie-tab' + (pie.active ? ' active' : '') + (pie.tombstoned ? ' tombstoned' : '');
            btn.textContent = pie.name;
            btn.title = pie.tombstoned ? 'Empty — data preserved in cloud' : '';
            btn.dataset.pieId = pie.id;
            btn.draggable = !pie.tombstoned;

            btn.addEventListener('click', (e) => {
                if (pie.tombstoned) {
                    // Show restore/delete menu; keep current pie in view
                    this.showTombstonedPieContextMenu(pie.id, e, btn);
                } else if (pie.active) {
                    this.showPieContextMenu(pie.id, e, btn);
                } else {
                    App.switchPie(pie.id);
                }
            });

            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (pie.tombstoned) {
                    this.showTombstonedPieContextMenu(pie.id, e);
                } else {
                    this.showPieContextMenu(pie.id, e);
                }
            });

            // Drag-and-drop reorder
            btn.addEventListener('dragstart', (e) => {
                btn.classList.add('dragging');
                e.dataTransfer.setData('text/plain', pie.id);
                e.dataTransfer.effectAllowed = 'move';
            });
            btn.addEventListener('dragend', () => {
                btn.classList.remove('dragging');
                container.querySelectorAll('.pie-tab').forEach(t => t.classList.remove('drag-over'));
            });
            btn.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                // Only highlight pie tabs, not the "+" button
                if (btn.dataset.pieId && !btn.classList.contains('dragging')) {
                    btn.classList.add('drag-over');
                }
            });
            btn.addEventListener('dragleave', () => {
                btn.classList.remove('drag-over');
            });
            btn.addEventListener('drop', (e) => {
                e.preventDefault();
                btn.classList.remove('drag-over');
                const draggedId = e.dataTransfer.getData('text/plain');
                if (draggedId && draggedId !== pie.id) {
                    this.reorderPie(draggedId, pie.id);
                }
            });

            // Long-press for mobile context menu
            let longPressTimer = null;
            btn.addEventListener('touchstart', (e) => {
                longPressTimer = setTimeout(() => {
                    e.preventDefault();
                    this.showPieContextMenu(pie.id, e.touches[0]);
                }, 600);
            }, { passive: false });
            btn.addEventListener('touchend', () => clearTimeout(longPressTimer));
            btn.addEventListener('touchmove', () => clearTimeout(longPressTimer), { passive: true });

            container.appendChild(btn);
        });

        // Add "+ New" button — greyed out on free tier with upgrade tooltip
        const addBtn = document.createElement('button');
        addBtn.className = 'pie-tab pie-tab-add';
        addBtn.textContent = '+';
        const isPro = License.isActive() || pies.length < 1;
        if (isPro) {
            addBtn.title = 'New pie';
        } else {
            addBtn.title = 'Upgrade to Pro for multiple pies';
            addBtn.style.opacity = '0.4';
            addBtn.style.cursor = 'pointer';
        }
        addBtn.addEventListener('click', () => this.promptNewPie());
        container.appendChild(addBtn);
    },

    reorderPie(draggedId, targetId) {
        if (!DataModel.pieMeta || !DataModel.pieMeta.pieIds) return;
        const ids = [...DataModel.pieMeta.pieIds];
        const fromIdx = ids.indexOf(draggedId);
        const toIdx = ids.indexOf(targetId);
        if (fromIdx === -1 || toIdx === -1) return;

        ids.splice(fromIdx, 1);
        ids.splice(toIdx, 0, draggedId);
        DataModel.pieMeta.pieIds = ids;
        DataModel.saveMeta();
        this.renderPieTabs();
    },

    showPieContextMenu(pieId, event, anchorEl) {
        // Remove any existing context menu
        this.closePieContextMenu();

        const menu = document.createElement('div');
        menu.className = 'pie-context-menu';

        if (anchorEl) {
            // Position below the tab button
            const rect = anchorEl.getBoundingClientRect();
            menu.style.left = rect.left + 'px';
            menu.style.top = (rect.bottom + 4) + 'px';
        } else {
            menu.style.left = (event.clientX || event.pageX) + 'px';
            menu.style.top = (event.clientY || event.pageY) + 'px';
        }

        const renameBtn = document.createElement('button');
        renameBtn.textContent = 'Rename';
        renameBtn.addEventListener('click', () => {
            this.closePieContextMenu();
            this.promptRenamePie(pieId);
        });
        menu.appendChild(renameBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'danger';
        deleteBtn.addEventListener('click', () => {
            this.closePieContextMenu();
            this.confirmDeletePie(pieId);
        });
        menu.appendChild(deleteBtn);

        document.body.appendChild(menu);

        // Close on click outside
        const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
                this.closePieContextMenu();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    },

    showTombstonedPieContextMenu(pieId, event, anchorEl) {
        this.closePieContextMenu();

        const menu = document.createElement('div');
        menu.className = 'pie-context-menu';

        if (anchorEl) {
            const rect = anchorEl.getBoundingClientRect();
            menu.style.left = rect.left + 'px';
            menu.style.top = (rect.bottom + 4) + 'px';
        } else {
            menu.style.left = (event.clientX || event.pageX) + 'px';
            menu.style.top = (event.clientY || event.pageY) + 'px';
        }

        const restoreBtn = document.createElement('button');
        restoreBtn.textContent = 'Restore';
        restoreBtn.addEventListener('click', () => {
            this.closePieContextMenu();
            App.restorePie(pieId);
        });
        menu.appendChild(restoreBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'danger';
        deleteBtn.addEventListener('click', () => {
            this.closePieContextMenu();
            this.confirmDeletePie(pieId);
        });
        menu.appendChild(deleteBtn);

        document.body.appendChild(menu);

        const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
                this.closePieContextMenu();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    },

    closePieContextMenu() {
        const existing = document.querySelector('.pie-context-menu');
        if (existing) existing.remove();
    },

    promptNewPie() {
        const pieCount = (DataModel.pieMeta?.pieIds || []).length;
        if (pieCount >= 1 && !License.isActive()) {
            this.showLicenseModal();
            return;
        }
        const name = prompt('New pie name:');
        if (name && name.trim()) {
            App.createPie(name.trim());
        }
    },

    requirePro(method) {
        if (License.isActive()) {
            this[method]();
        } else {
            this.showLicenseModal();
        }
    },

    showLicenseModal() {
        const overlay = document.getElementById('license-overlay');
        if (overlay) {
            overlay.classList.add('active');
            const input = document.getElementById('license-key-input');
            if (input) input.value = '';
            const status = document.getElementById('license-status');
            if (status) { status.textContent = ''; status.className = ''; }
        }
    },

    closeLicenseModal(event) {
        if (event && event.target !== event.currentTarget) return;
        document.getElementById('license-overlay')?.classList.remove('active');
    },

    async activateLicense() {
        const input = document.getElementById('license-key-input');
        const status = document.getElementById('license-status');
        const btn = document.getElementById('license-activate-btn');
        const key = input?.value?.trim();
        if (!key) return;

        if (btn) btn.disabled = true;
        if (status) { status.textContent = 'Validating…'; status.className = ''; }

        const valid = await License.activate(key);

        if (valid) {
            if (status) { status.textContent = '✓ License activated! Reloading…'; status.className = 'license-status-ok'; }
            setTimeout(() => location.reload(), 1000);
        } else {
            if (status) { status.textContent = '✗ Invalid or revoked license key.'; status.className = 'license-status-err'; }
            if (btn) btn.disabled = false;
        }
    },

    promptRenamePie(pieId) {
        const currentName = DataModel.getPieName(pieId);
        const name = prompt('Rename pie:', currentName);
        if (name && name.trim() && name.trim() !== currentName) {
            App.renamePie(pieId, name.trim());
        }
    },

    confirmDeletePie(pieId) {
        const name = DataModel.getPieName(pieId);
        if (confirm(`Delete "${name}" and all its data? This cannot be undone.`)) {
            App.deletePie(pieId);
        }
    },

    // ── Schedule key ────────────────────────────────────────
    initScheduleKey() {
        const el = document.getElementById('schedule-key');
        if (!el) return;
        if (localStorage.getItem('scheduleKeyCollapsed') === 'true') {
            el.classList.add('is-collapsed');
        }
    },

    scheduleKeyClick(e) {
        const el = document.getElementById('schedule-key');
        if (!el) return;
        // Toggle the dismiss tooltip on click; close if clicking outside
        el.classList.toggle('show-tooltip');
        e.stopPropagation();
        if (el.classList.contains('show-tooltip')) {
            const close = () => {
                el.classList.remove('show-tooltip');
                document.removeEventListener('click', close);
            };
            document.addEventListener('click', close);
        }
    },

    dismissScheduleKey(e) {
        e.stopPropagation();
        const el = document.getElementById('schedule-key');
        if (!el) return;
        el.classList.remove('show-tooltip');
        el.classList.remove('theme-panel-open'); // close panel before collapsing so it isn't orphaned
        el.classList.add('is-collapsed');
        localStorage.setItem('scheduleKeyCollapsed', 'true');
    },

    expandScheduleKey() {
        const el = document.getElementById('schedule-key');
        if (!el) return;
        el.classList.remove('is-collapsed');
        localStorage.setItem('scheduleKeyCollapsed', 'false');
    },

    // ── Theme picker ─────────────────────────────────────────

    /**
     * Apply a theme, persist it to meta (all storage backends), and refresh the panel.
     * This is the write-path bridge described in brainpie-theme-persistence.md §3b.
     * DataModel.saveMeta() routes to Firebase, local file, or localStorage automatically.
     */
    setTheme(themeName) {
        DataModel.pieMeta.theme = themeName;
        DataModel.saveMeta();
        applyTheme(themeName);
        UI.renderThemePanel();
    },

    /**
     * Toggle the theme picker panel open/closed.
     * Follows the same outside-click listener pattern as scheduleKeyClick().
     * e.stopPropagation() prevents this click from triggering the tooltip's own
     * outside-click handler, which would immediately close the panel again.
     */
    toggleThemePanel(e) {
        e.stopPropagation();
        const el = document.getElementById('schedule-key');
        if (!el) return;
        const opening = !el.classList.contains('theme-panel-open');
        el.classList.toggle('theme-panel-open');
        if (opening) {
            UI.renderThemePanel();
            // Dismiss panel when the user clicks outside the entire #schedule-key container.
            // el.contains() covers both the legend and the panel, so clicks inside either
            // area leave the panel open.
            const close = (evt) => {
                if (!el.contains(evt.target)) {
                    el.classList.remove('theme-panel-open');
                    document.removeEventListener('click', close);
                }
            };
            document.addEventListener('click', close);
        }
    },

    /**
     * Populate (or refresh) the theme panel with one button per theme.
     * Iterates Object.keys(Themes) so new themes are picked up automatically
     * without touching this function. Full innerHTML rewrite on each call is
     * intentional — there are only 5 buttons and it keeps state in one place.
     */
    renderThemePanel() {
        const panel = document.getElementById('theme-panel');
        if (!panel) return;
        const activeTheme = (DataModel.pieMeta && DataModel.pieMeta.theme) || ACTIVE_THEME;
        let saved = { calm: '#4CAF50', urgent: '#f05252' };
        try {
            const s = JSON.parse(localStorage.getItem('brainpie-user-theme') || 'null');
            if (s) saved = { ...saved, ...s };
        } catch (_) {}
        const themeDefault = (Themes[activeTheme] || Themes.default).list || '#2196F3';
        let listColor = themeDefault;
        try { listColor = localStorage.getItem('brainpie-list-color') || themeDefault; } catch (_) {}
        const buttons = Object.keys(Themes).map(name => {
            const isActive = name === activeTheme;
            return `<button class="theme-btn${isActive ? ' is-active' : ''}" onclick="UI.setTheme('${name}'); event.stopPropagation();">${name}</button>`;
        }).join('');
        const pickers = `<div class="user-theme-pickers${activeTheme === 'user' ? ' active' : ''}">
            <label class="user-theme-label"><span>Calm</span><input type="color" id="ut-calm" value="${saved.calm}" oninput="UI._onUserColorInput()"></label>
            <label class="user-theme-label"><span>Urgent</span><input type="color" id="ut-urgent" value="${saved.urgent}" oninput="UI._onUserColorInput()"></label>
        </div>
        <div class="user-theme-pickers active user-list-picker">
            <label class="user-theme-label"><input type="color" id="ut-list" value="${listColor}" oninput="UI._onListColorInput()"><span>Checklist</span></label>
            <button class="user-list-reset warn" onclick="UI._resetListColor(); event.stopPropagation();" title="Reset to default">↺</button>
            <label class="user-theme-label fade-toggle" onclick="event.stopPropagation()"><input type="checkbox" id="ut-fade" ${localStorage.getItem('brainpie-pill-fade') !== '0' ? 'checked' : ''} onchange="UI._onFadeToggle()"><span>Fade</span></label>
        </div>`;
        panel.innerHTML = buttons + pickers;
    },

    _onUserColorInput() {
        const calm = document.getElementById('ut-calm');
        const urgent = document.getElementById('ut-urgent');
        if (calm && urgent) this.updateUserTheme(calm.value, urgent.value);
    },

    _resetListColor() {
        localStorage.removeItem('brainpie-list-color');
        const el = document.getElementById('ut-list');
        if (el) el.value = '#2196F3';
        const activeTheme = (DataModel.pieMeta && DataModel.pieMeta.theme) || ACTIVE_THEME;
        applyTheme(activeTheme);
    },

    updateKeyFade() {
        const fade = localStorage.getItem('brainpie-pill-fade') !== '0';
        const opacities = fade
            ? { base: 0.2, week: 0.75, tomorrow: 0.85, today: 1.0, past: 1 }
            : { base: 1,   week: 1,    tomorrow: 1,    today: 1,   past: 1   };
        const borders = fade
            ? { base: 'var(--sched-color-base)',     week: 'var(--sched-color-week)',     tomorrow: 'var(--sched-color-tomorrow)',     today: 'var(--sched-color-today)',     past: 'var(--sched-color-past)' }
            : { base: 'var(--sched-color-default-border)', week: 'var(--sched-color-week-border)', tomorrow: 'var(--sched-color-tomorrow-border)', today: 'var(--sched-color-today-border)', past: 'var(--sched-color-past-border)' };
        document.querySelectorAll('.key-pill[data-sched]').forEach(el => {
            const state = el.dataset.sched;
            el.style.opacity = opacities[state] ?? 1;
            el.style.outline = `2px solid ${borders[state] ?? 'var(--sched-color-default-border)'}`;
        });
    },

    _onFadeToggle() {
        const el = document.getElementById('ut-fade');
        if (!el) return;
        localStorage.setItem('brainpie-pill-fade', el.checked ? '1' : '0');
        this.updateKeyFade();
        App.render();
    },

    _onListColorInput() {
        const el = document.getElementById('ut-list');
        if (!el) return;
        localStorage.setItem('brainpie-list-color', el.value);
        const activeTheme = (DataModel.pieMeta && DataModel.pieMeta.theme) || ACTIVE_THEME;
        applyTheme(activeTheme);
    },

    updateUserTheme(calm, urgent) {
        localStorage.setItem('brainpie-user-theme', JSON.stringify({ calm, urgent }));
        Themes.user = generateUserTheme(calm, urgent);
        applyTheme('user');
        if (!DataModel.pieMeta) return;
        DataModel.pieMeta.theme = 'user';
        DataModel.saveMeta();
    },

    // ==========================================
    // Colour scheme (dark / light / auto)
    // ==========================================

    /**
     * Apply a colour scheme preference to the document.
     * Sets data-theme on <html>, persists to localStorage, and syncs the icon.
     * @param {'light'|'dark'|'auto'} preference
     */
    applyColorScheme(preference) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = preference === 'dark' || (preference === 'auto' && prefersDark);
        document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
        localStorage.setItem('brainpie-color-scheme', preference);
        this.updateThemeToggleIcon(preference);
    },

    /**
     * Called by Settings panel radio buttons.
     * Applies the scheme and keeps the top-bar icon in sync.
     */
    setColorScheme(value) {
        this.applyColorScheme(value);
        // Sync radio in Settings panel (in case called from JS rather than the radio itself)
        const radio = document.querySelector(`input[name="color-scheme"][value="${value}"]`);
        if (radio) radio.checked = true;
    },

    /**
     * Cycle light → dark → auto → light.
     * Wired to the top-bar quick-toggle button.
     */
    cycleColorScheme() {
        const current = localStorage.getItem('brainpie-color-scheme') || 'auto';
        const next = current === 'light' ? 'dark' : current === 'dark' ? 'auto' : 'light';
        this.setColorScheme(next);
    },

    /**
     * Update all .theme-toggle-icon elements to reflect the current preference.
     * ☀ = light, ☽ = dark, ◑ = auto
     */
    updateThemeToggleIcon(preference) {
        const icon = preference === 'light' ? '☀' : preference === 'dark' ? '☽' : '◑';
        document.querySelectorAll('.theme-toggle-icon').forEach(el => el.textContent = icon);
    },

    /**
     * Read saved colour-scheme preference and apply it.
     * Called once on DOMContentLoaded so the icon matches the saved state.
     */
    initColorScheme() {
        const pref = localStorage.getItem('brainpie-color-scheme') || 'auto';
        // Theme is already applied by the flicker-prevention inline script;
        // we just need to update the icon and the Settings radio.
        this.updateThemeToggleIcon(pref);
        // Wire up live system preference change for Auto mode
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            const current = localStorage.getItem('brainpie-color-scheme') || 'auto';
            if (current === 'auto') this.applyColorScheme('auto');
        });
    },
};
