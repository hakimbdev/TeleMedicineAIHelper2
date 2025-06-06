#!/bin/bash

# TeleMedicine AI Helper - Production Deployment Script
# This script helps prepare and deploy the application to production

set -e  # Exit on any error

echo "🚀 TeleMedicine AI Helper - Production Deployment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js version: $(node --version)"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    print_success "npm version: $(npm --version)"
}

# Check environment variables
check_env() {
    print_status "Checking environment variables..."
    
    if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
        print_warning "No .env file found. Creating from template..."
        if [ -f ".env.production" ]; then
            cp .env.production .env.local
            print_warning "Please edit .env.local with your production values before continuing."
            read -p "Press Enter when you've configured your environment variables..."
        else
            print_error "No environment template found. Please create .env file with required variables."
            exit 1
        fi
    fi
    
    # Check for required variables
    if [ -f ".env.local" ]; then
        source .env.local
    elif [ -f ".env" ]; then
        source .env
    fi
    
    if [ -z "$VITE_SUPABASE_URL" ] || [ "$VITE_SUPABASE_URL" = "your_supabase_url_here" ]; then
        print_error "VITE_SUPABASE_URL is not configured properly"
        exit 1
    fi
    
    if [ -z "$VITE_SUPABASE_ANON_KEY" ] || [ "$VITE_SUPABASE_ANON_KEY" = "your_supabase_anon_key_here" ]; then
        print_error "VITE_SUPABASE_ANON_KEY is not configured properly"
        exit 1
    fi
    
    print_success "Environment variables configured"
}

# Install dependencies
install_deps() {
    print_status "Installing dependencies..."
    npm ci
    print_success "Dependencies installed"
}

# Run linting
run_lint() {
    print_status "Running linter..."
    if npm run lint; then
        print_success "Linting passed"
    else
        print_warning "Linting issues found. Continue anyway? (y/n)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Run build
run_build() {
    print_status "Building application for production..."
    
    # Clean previous build
    rm -rf dist
    
    # Build
    if npm run build; then
        print_success "Build completed successfully"
    else
        print_error "Build failed"
        exit 1
    fi
    
    # Check build size
    BUILD_SIZE=$(du -sh dist | cut -f1)
    print_status "Build size: $BUILD_SIZE"
}

# Test build locally
test_build() {
    print_status "Testing build locally..."
    print_status "Starting preview server..."
    print_status "Open http://localhost:4173 to test the build"
    print_status "Press Ctrl+C to stop the preview server when done testing"
    
    npm run preview
}

# Deploy to Netlify
deploy_netlify() {
    print_status "Deploying to Netlify..."
    
    if ! command -v netlify &> /dev/null; then
        print_status "Installing Netlify CLI..."
        npm install -g netlify-cli
    fi
    
    print_status "Deploying to Netlify..."
    netlify deploy --prod --dir=dist
    
    print_success "Deployment completed!"
}

# Main deployment flow
main() {
    echo
    print_status "Starting production deployment process..."
    echo
    
    # Pre-flight checks
    check_node
    check_npm
    check_env
    
    # Build process
    install_deps
    run_lint
    run_build
    
    # Ask user what to do next
    echo
    print_status "Build completed successfully!"
    echo
    echo "What would you like to do next?"
    echo "1) Test build locally"
    echo "2) Deploy to Netlify"
    echo "3) Exit (manual deployment)"
    echo
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            test_build
            ;;
        2)
            deploy_netlify
            ;;
        3)
            print_status "Build is ready in ./dist directory"
            print_status "You can now deploy manually to your hosting provider"
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo
    print_success "Deployment process completed!"
    echo
    print_status "Next steps:"
    echo "1. Test all functionality on the live site"
    echo "2. Complete the production testing checklist"
    echo "3. Set up monitoring and analytics"
    echo "4. Configure API credentials for full functionality"
    echo
}

# Run main function
main "$@"
