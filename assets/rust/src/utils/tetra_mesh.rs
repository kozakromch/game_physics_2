use nalgebra::Vector3;

pub struct TetraMesh {
    pub positions: Vec<Vector3<f64>>,
    pub tetr_indexes: Vec<[usize; 4]>,
    pub edge_indexes: Vec<usize>,
}

impl TetraMesh {
    pub async fn new(path_to_assets: &str, path_to_obj: &str) -> Self {
        // println!("{:?}", std::env::current_dir().unwrap());
        let path = format!("{}/{}", path_to_assets, path_to_obj);

        let asset = three_d_asset::io::load_async(&[path]).await.unwrap();
        let asset_data: &[u8] = asset.get(path_to_obj).unwrap();
        // Оригинальные позиции
        let mut positions: Vec<Vector3<f64>> = Vec::new();
        let mut tetr_indexes: Vec<[usize; 4]> = Vec::new();
        let mut edge_indexes: Vec<usize> = Vec::new();
        // Преобразование asset_data в строку
        let asset_data_str = std::str::from_utf8(asset_data).unwrap();

        for line in asset_data_str.lines() {
            let mut words = line.split_whitespace();
            match words.next() {
                Some("v") => {
                    // Чтение позиции вершины
                    let x = words.next().unwrap().parse::<f64>().unwrap();
                    let y = words.next().unwrap().parse::<f64>().unwrap();
                    let z = words.next().unwrap().parse::<f64>().unwrap();
                    positions.push(Vector3::new(x, y, z));
                }
                Some("f") => {
                    // Чтение индексов вершин тетраэдра
                    let mut indexes =
                        words.map(|w| w.split('/').next().unwrap().parse::<usize>().unwrap() - 1);

                    let i1 = indexes.next().unwrap() as usize;
                    let i2 = indexes.next().unwrap() as usize;
                    let i3 = indexes.next().unwrap() as usize;
                    let i4 = indexes.next().unwrap() as usize;

                    // Сохранение индексов для тетраэдра
                    tetr_indexes.push([i1, i2, i3, i4]);
                    // Создание рёбер
                    let mut make_edge = |i1: usize, i2: usize| {
                        edge_indexes.push(i1);
                        edge_indexes.push(i2);
                    };
                    make_edge(i1, i2);
                    make_edge(i1, i3);
                    make_edge(i1, i4);
                    make_edge(i2, i3);
                    make_edge(i2, i4);
                    make_edge(i3, i4);
                }
                _ => {}
            }
        }
        TetraMesh {
            positions,
            tetr_indexes,
            edge_indexes,
        }
    }
}
