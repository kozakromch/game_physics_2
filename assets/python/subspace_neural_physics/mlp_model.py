import torch.nn as nn
#%% Build PyTorch Model
class MLPModel(nn.Module):
    def __init__(self, num_pca_x, num_input):
        super().__init__()
        num_hidden = int(num_input)
        self.model = nn.Sequential(
           nn.Linear(num_input, num_hidden),
           nn.ReLU(),
           nn.BatchNorm1d(num_hidden),
           nn.Linear(num_hidden, num_hidden),
           nn.BatchNorm1d(num_hidden),
           nn.ReLU(),
           nn.Linear(num_hidden, num_hidden),
           nn.BatchNorm1d(num_hidden),
           nn.ReLU(),
           nn.Linear(num_hidden, num_hidden),
           nn.ReLU(),
           nn.Linear(num_hidden, num_hidden),
           nn.ReLU(),
           nn.Linear(num_hidden, num_pca_x)
        )

    def forward(self, x):
        # flatten the input if it has more than 2 dimensions
        if x.dim() > 2:
            x = x.view(x.size(0), -1)
        return self.model(x)