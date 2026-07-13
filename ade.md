# Instructions


## GitHub
- Sign up for GitHub 
- Download Git - [Link](https://github.com/git-for-windows/git/releases/download/v2.55.0.windows.2/Git-2.55.0.2-64-bit.exe)
- Link your local Git to GitHub via SSH
    1. Open the Windows search bar, search for `Git Bash` and open it. You should get a terminal window.
    3. Run `git config --global user.name your-name` - replacing `your-name` with your github name.
    4. Run `git config --global user.email your-email` - replacing `your-email`
    5. In terminal type `ssh-keygen -t ed25519 -C "your_email@example.com"` - replacing the email with yours.
    6. Hit Enter through all options
    7. Run `cat ~/.ssh/id_ed25519.pub` and copy the output the terminal returns.
    8. Go to GitHub.com --> You User Profile (Top Right) --> SSH and GPG Keys (along the side) --> New SSH Key --> Paste the output into the text box.

## Publishing the Website
1. Upload your images
2. Make the puzzle.json file with the right info
3. Right click on the root folder